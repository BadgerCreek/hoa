import { auth } from '@/lib/auth'
import { db } from '@/db'
import { users, properties, auditLogs } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { getPermissions, hasPermission } from '@/lib/permissions'

const BOARD_ROLES = new Set(['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin'])

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin ?? false
  if (!isAdmin && !BOARD_ROLES.has(role)) return new Response('Forbidden', { status: 403 })

  const members = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
  }).from(users).orderBy(asc(users.name))

  return Response.json(members)
}

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['resident', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']).default('resident'),
  lotNumber: z.string().optional(),
  address: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  const perms = await getPermissions()
  if (!hasPermission(perms['members.manage'], userRole, userIsAdmin)) {
    return new Response('Forbidden', { status: 403 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid data', { status: 400 })

  const { name, email, phone, role, lotNumber, address } = parsed.data

  const [user] = await db.insert(users).values({
    id: randomUUID(),
    name,
    email,
    phone,
    role,
  }).returning()

  if (address) {
    await db.insert(properties).values({
      ownerId: user.id,
      address,
      lotNumber,
    })
  }

  await db.insert(auditLogs).values({
    action: 'member.created',
    entityType: 'user',
    entityId: user.id,
    performedBy: session.user.id!,
    details: { name, email, role },
  })

  return Response.json({ ok: true, user })
}
