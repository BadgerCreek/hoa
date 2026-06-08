import { auth } from '@/lib/auth'
import { db } from '@/db'
import { proposals, auditLogs } from '@/db/schema'
import { z } from 'zod'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

const schema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) {
    return new Response('Forbidden', { status: 403 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid data', { status: 400 })

  const [proposal] = await db.insert(proposals).values({
    ...parsed.data,
    status: 'draft',
    createdBy: session.user.id!,
  }).returning()

  await db.insert(auditLogs).values({
    action: 'proposal.created_manually',
    entityType: 'proposal',
    entityId: proposal.id,
    performedBy: session.user.id!,
    details: { title: proposal.title },
  })

  return Response.json({ ok: true, proposal })
}
