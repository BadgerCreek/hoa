import { auth } from '@/lib/auth'
import { db } from '@/db'
import { payments, transactions, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  if (userRole !== 'board_president' && !userIsAdmin) {
    return new Response('Only the president can approve payments', { status: 403 })
  }

  const { id } = await params
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, id) })
  if (!payment) return new Response('Not found', { status: 404 })
  if (payment.status !== 'pending') return new Response('Payment is not pending', { status: 400 })

  // Create transaction
  const today = new Date().toISOString().split('T')[0]
  const [tx] = await db.insert(transactions).values({
    budgetId: payment.budgetId,
    amount: payment.amount,
    type: 'expense',
    description: payment.vendor ? `${payment.title} — ${payment.vendor}` : payment.title,
    date: today,
    approvedBy: session.user.id,
    agentId: null,
  }).returning()

  // Update payment
  await db.update(payments).set({
    status: 'approved',
    approvedBy: session.user.id,
    approvedAt: new Date(),
    transactionId: tx.id,
    updatedAt: new Date(),
  }).where(eq(payments.id, id))

  await db.insert(auditLogs).values({
    action: 'payment.approved',
    entityType: 'payment',
    entityId: id,
    performedBy: session.user.id!,
    details: { title: payment.title, amount: payment.amount, transactionId: tx.id },
  })

  return Response.json({ ok: true, transactionId: tx.id })
}
