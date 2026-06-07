import { auth } from '@/lib/auth'
import { db } from '@/db'
import { proposals, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getPermissions, hasPermission } from '@/lib/permissions'

const schema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
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
  if (!hasPermission(perms['proposals.edit'], userRole, userIsAdmin)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { id } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid data', { status: 400 })

  const [updated] = await db
    .update(proposals)
    .set(parsed.data)
    .where(eq(proposals.id, id))
    .returning()

  if (!updated) return new Response('Not found', { status: 404 })

  await db.insert(auditLogs).values({
    action: 'proposal.edited',
    entityType: 'proposal',
    entityId: id,
    performedBy: session.user.id!,
    details: { fields: Object.keys(parsed.data) },
  })

  return Response.json({ ok: true, proposal: updated })
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
  if (!hasPermission(perms['proposals.delete'], userRole, userIsAdmin)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { id } = await params

  const [deleted] = await db.delete(proposals).where(eq(proposals.id, id)).returning()
  if (!deleted) return new Response('Not found', { status: 404 })

  await db.insert(auditLogs).values({
    action: 'proposal.deleted',
    entityType: 'proposal',
    entityId: id,
    performedBy: session.user.id!,
    details: { title: deleted.title },
  })

  return Response.json({ ok: true })
}
