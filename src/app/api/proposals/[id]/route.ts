import { auth } from '@/lib/auth'
import { db } from '@/db'
import { proposals, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

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

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) {
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
