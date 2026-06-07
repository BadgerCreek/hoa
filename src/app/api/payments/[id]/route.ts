import { auth } from '@/lib/auth'
import { db } from '@/db'
import { payments, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  vendor: z.string().optional(),
  category: z.enum(['maintenance', 'utilities', 'administrative', 'landscaping', 'insurance', 'other']).optional(),
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

  const payment = await db.query.payments.findFirst({ where: eq(payments.id, id) })
  if (!payment) return new Response('Not found', { status: 404 })
  if (payment.status !== 'pending') return new Response('Cannot edit a processed payment', { status: 400 })

  const { amount, ...rest } = parsed.data
  await db.update(payments).set({
    ...rest,
    ...(amount !== undefined && { amount: amount.toString() }),
    updatedAt: new Date(),
  }).where(eq(payments.id, id))

  await db.insert(auditLogs).values({
    action: 'payment.edited',
    entityType: 'payment',
    entityId: id,
    performedBy: session.user.id!,
    details: { fields: Object.keys(parsed.data) },
  })

  return Response.json({ ok: true })
}
