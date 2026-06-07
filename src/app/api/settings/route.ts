import { auth } from '@/lib/auth'
import { db } from '@/db'
import { settings } from '@/db/schema'
import { z } from 'zod'
import {
  getPermissions,
  invalidatePermissionsCache,
  PERMISSION_DEFAULTS,
} from '@/lib/permissions'

const thresholds = ['board', 'admin'] as const
const permissionsSchema = z.record(
  z.enum(Object.keys(PERMISSION_DEFAULTS) as [string, ...string[]]),
  z.enum(thresholds)
)

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const perms = await getPermissions()
  return Response.json(perms)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = session.user.role
  const userIsAdmin = session.user.isAdmin ?? false
  if (userRole !== 'admin' && !userIsAdmin) {
    return new Response('Forbidden', { status: 403 })
  }

  const parsed = permissionsSchema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid data', { status: 400 })

  await db
    .insert(settings)
    .values({
      key: 'permissions',
      value: parsed.data,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: parsed.data,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      },
    })

  invalidatePermissionsCache()
  return Response.json({ ok: true })
}
