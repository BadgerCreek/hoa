import { auth } from '@/lib/auth'
import { db } from '@/db'
import { tasks, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { action, notes } = await req.json() as { action: 'approve' | 'reject'; notes?: string }

  const [updated] = await db
    .update(tasks)
    .set({
      status: action === 'approve' ? 'approved' : 'rejected',
      completedBy: action === 'approve' ? null : session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id))
    .returning()

  if (!updated) return new Response('Task not found', { status: 404 })

  await db.insert(auditLogs).values({
    action: `task.${action}d`,
    entityType: 'task',
    entityId: id,
    performedBy: session.user.id!,
    details: { notes },
  })

  return Response.json({ ok: true, task: updated })
}
