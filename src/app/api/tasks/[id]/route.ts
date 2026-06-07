import { auth } from '@/lib/auth'
import { db } from '@/db'
import { tasks, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  agentThoughts: z.string().optional(),
})

export async function PATCH(
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
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid data', { status: 400 })

  const [updated] = await db
    .update(tasks)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning()

  if (!updated) return new Response('Not found', { status: 404 })

  await db.insert(auditLogs).values({
    action: 'task.edited',
    entityType: 'task',
    entityId: id,
    performedBy: session.user.id!,
    details: { fields: Object.keys(parsed.data) },
  })

  return Response.json({ ok: true, task: updated })
}
