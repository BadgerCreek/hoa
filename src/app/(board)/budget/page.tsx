import { db } from '@/db'
import { budgets, transactions, budgetLineItems } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { auth, isAdmin as checkAdmin } from '@/lib/auth'
import { BudgetView } from '@/components/BudgetView'

export default async function BudgetPage() {
  const session = await auth()
  const isAdmin = checkAdmin(session?.user?.role, session?.user?.isAdmin)
  const FISCAL_YEAR = 2025 // FY 25/26 (April 1 – March 31)

  const BOARD_ROLES = new Set([
    'board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer',
  'board_arc',
  ])
  const canApprove = isAdmin || BOARD_ROLES.has(session?.user?.role ?? '')

  const lines = await db.select().from(budgetLineItems)
    .where(eq(budgetLineItems.fiscalYear, FISCAL_YEAR))
    .orderBy(budgetLineItems.section, budgetLineItems.sortOrder)

  const currentBudget = await db.query.budgets.findFirst({
    where: eq(budgets.fiscalYear, new Date().getFullYear()),
  })

  const txList = currentBudget
    ? await db.select().from(transactions)
        .where(eq(transactions.budgetId, currentBudget.id))
        .orderBy(desc(transactions.date))
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Budget</h1>
        <p className="text-sm text-muted-foreground mt-1">FY: April 1 – March 31 · Click any value to edit</p>
      </div>
      <BudgetView
        initialLines={lines}
        transactions={txList}
        fiscalYear={FISCAL_YEAR}
        isAdmin={isAdmin}
        canApprove={canApprove}
      />
    </div>
  )
}
