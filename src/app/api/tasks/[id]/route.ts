import { auth } from '@/lib/auth'
import { db } from '@/db'
import { tasks, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getPermissions, hasPermission } from '@/lib/permissions'

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

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  const perms = await getPermissions()
  if (!hasPermission(perms['tasks.edit'], userRole, userIsAdmin)) {
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  const perms = await getPermissions()
  if (!hasPermission(perms['tasks.delete'], userRole, userIsAdmin)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { id } = await params

  const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning()
  if (!deleted) return new Response('Not found', { status: 404 })

  await db.insert(auditLogs).values({
    action: 'task.deleted',
    entityType: 'task',
    entityId: id,
    performedBy: session.user.id!,
    details: { title: deleted.title },
  })

  return Response.json({ ok: true })
}
