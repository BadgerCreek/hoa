import { auth } from '@/lib/auth'
import { db } from '@/db'
import { tasks, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'board_arc', 'admin']

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

  const { id } = await params

  const [updated] = await db
    .update(tasks)
    .set({ status: 'completed', completedBy: session.user.id, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning()

  if (!updated) return new Response('Not found', { status: 404 })

  await db.insert(auditLogs).values({
    action: 'task.completed',
    entityType: 'task',
    entityId: id,
    performedBy: session.user.id!,
    details: { title: updated.title },
  })

  return Response.json({ ok: true })
}
