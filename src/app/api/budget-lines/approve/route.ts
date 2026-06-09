import { auth } from '@/lib/auth'
import { db } from '@/db'
import { budgets, budgetLineItems } from '@/db/schema'
import { eq } from 'drizzle-orm'

const BOARD_ROLES = new Set([
  'board_president',
  'board_vp',
  'board_secretary',
  'board_treasurer',
  'board_arc',
])

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const role = session.user.role ?? ''
  const isAdmin = session.user.isAdmin ?? false
  if (!isAdmin && !BOARD_ROLES.has(role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { fromYear, toYear } = await req.json()
  if (!fromYear || !toYear || toYear <= fromYear) {
    return new Response('Invalid years', { status: 400 })
  }

  const existing = await db.select({ id: budgetLineItems.id })
    .from(budgetLineItems)
    .where(eq(budgetLineItems.fiscalYear, toYear))
    .limit(1)

  if (existing.length > 0) {
    return Response.json({ error: `Budget for FY ${toYear}/${toYear + 1} already exists` }, { status: 409 })
  }

  const fromLines = await db.select().from(budgetLineItems)
    .where(eq(budgetLineItems.fiscalYear, fromYear))

  const toInsert = fromLines.map(l => ({
    fiscalYear: toYear,
    section: l.section,
    description: l.description,
    budgetedAmount: l.proposedAmount,
    sortOrder: l.sortOrder ?? 0,
  }))

  if (toInsert.length === 0) {
    return Response.json({ error: 'No lines found to promote' }, { status: 400 })
  }

  const totalBudget = fromLines
    .filter(l => l.section === 'income')
    .reduce((sum, l) => sum + parseFloat(l.proposedAmount ?? '0'), 0)

  await db.insert(budgets).values({
    fiscalYear: toYear,
    totalBudget: totalBudget.toFixed(2),
    allocated: '0',
    notes: `Approved from FY ${fromYear}/${fromYear + 1} proposed budget`,
  })

  await db.insert(budgetLineItems).values(toInsert)

  return Response.json({ ok: true, linesCreated: toInsert.length })
}
