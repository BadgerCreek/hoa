import { auth } from '@/lib/auth'
import { db } from '@/db'
import { payments, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({ reason: z.string().optional() })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  if (userRole !== 'board_president' && !userIsAdmin) {
    return new Response('Only the president can reject payments', { status: 403 })
  }

  const { id } = await params
  const { reason } = schema.parse(await req.json())

  const payment = await db.query.payments.findFirst({ where: eq(payments.id, id) })
  if (!payment) return new Response('Not found', { status: 404 })
  if (payment.status !== 'pending') return new Response('Payment is not pending', { status: 400 })

  await db.update(payments).set({
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: new Date(),
  }).where(eq(payments.id, id))

  await db.insert(auditLogs).values({
    action: 'payment.rejected',
    entityType: 'payment',
    entityId: id,
    performedBy: session.user.id!,
    details: { title: payment.title, reason },
  })

  return Response.json({ ok: true })
}
