import { auth } from '@/lib/auth'
import { db } from '@/db'
import { arcApplications, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

const schema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected', 'needs_info']),
  decision: z.string().optional(),
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

  const { id } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid', { status: 400 })

  const [updated] = await db
    .update(arcApplications)
    .set({
      status: parsed.data.status,
      decision: parsed.data.decision,
      decidedBy: ['approved', 'rejected'].includes(parsed.data.status) ? session.user.id : undefined,
      decidedAt: ['approved', 'rejected'].includes(parsed.data.status) ? new Date() : undefined,
    })
    .where(eq(arcApplications.id, id))
    .returning()

  if (!updated) return new Response('Not found', { status: 404 })

  await db.insert(auditLogs).values({
    action: 'arc.status_changed',
    entityType: 'arc_application',
    entityId: id,
    performedBy: session.user.id!,
    details: { newStatus: parsed.data.status },
  })

  return Response.json({ ok: true })
}
