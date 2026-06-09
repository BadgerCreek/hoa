import { auth } from '@/lib/auth'
import { db } from '@/db'
import { payments, budgets, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'board_arc', 'admin']

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  vendor: z.string().optional(),
  category: z.enum(['maintenance', 'utilities', 'administrative', 'landscaping', 'insurance', 'other']).default('other'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) {
    return new Response('Forbidden', { status: 403 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid data', { status: 400 })

  const year = new Date().getFullYear()
  const budget = await db.query.budgets.findFirst({ where: eq(budgets.fiscalYear, year) })

  const [payment] = await db.insert(payments).values({
    ...parsed.data,
    amount: parsed.data.amount.toString(),
    requestedBy: session.user.id!,
    budgetId: budget?.id,
  }).returning()

  await db.insert(auditLogs).values({
    action: 'payment.requested',
    entityType: 'payment',
    entityId: payment.id,
    performedBy: session.user.id!,
    details: { title: payment.title, amount: parsed.data.amount },
  })

  return Response.json({ ok: true, payment })
}
