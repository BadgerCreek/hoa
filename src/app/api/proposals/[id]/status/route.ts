import { auth } from '@/lib/auth'
import { db } from '@/db'
import { proposals, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'board_arc', 'admin']

const schema = z.object({
  status: z.enum(['open', 'closed', 'approved', 'rejected']),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { id: proposalId } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid status', { status: 400 })

  const closedStatuses = ['closed', 'approved', 'rejected']
  const [updated] = await db
    .update(proposals)
    .set({
      status: parsed.data.status,
      closedAt: closedStatuses.includes(parsed.data.status) ? new Date() : null,
    })
    .where(eq(proposals.id, proposalId))
    .returning()

  if (!updated) return new Response('Not found', { status: 404 })

  await db.insert(auditLogs).values({
    action: 'proposal.status_changed',
    entityType: 'proposal',
    entityId: proposalId,
    performedBy: session.user.id!,
    details: { newStatus: parsed.data.status, title: updated.title },
  })

  return Response.json({ ok: true, proposal: updated })
}
