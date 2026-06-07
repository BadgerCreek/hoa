import { auth } from '@/lib/auth'
import { db } from '@/db'
import { budgetLineItems } from '@/db/schema'
import { eq } from 'drizzle-orm'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

const FY2526 = [
  // Income
  { section: 'income' as const, description: 'Dues Owners (12 Lots)', budgetedAmount: '16500', actualAmount: '16500', proposedAmount: '16500', comment: '', sortOrder: 1 },
  { section: 'income' as const, description: 'Dues Neighbors', budgetedAmount: '900', actualAmount: '900', proposedAmount: '900', comment: '', sortOrder: 2 },
  { section: 'income' as const, description: 'Late Dues collected', budgetedAmount: '0', actualAmount: '64', proposedAmount: '0', comment: '', sortOrder: 3 },
  // Expenses
  { section: 'expense' as const, description: 'Snow Plowing', budgetedAmount: '4200', actualAmount: '3881', proposedAmount: '4200', comment: '$3,750 plus $450 for one grader push back', sortOrder: 1 },
  { section: 'expense' as const, description: 'Property Management', budgetedAmount: '1375', actualAmount: '1375', proposedAmount: '1375', comment: 'Browning Forgiveness of Dues for services provided', sortOrder: 2 },
  { section: 'expense' as const, description: 'John, John and Hill Accounting Firm', budgetedAmount: '800', actualAmount: '1479', proposedAmount: '800', comment: 'Two fees (2024 & 2025) paid this fiscal year', sortOrder: 3 },
  { section: 'expense' as const, description: 'Road/Common Area Repairs', budgetedAmount: '5220', actualAmount: '5220', proposedAmount: '3975', comment: '', sortOrder: 4 },
  { section: 'expense' as const, description: 'Maintenance/Bridge Inspection/Fence/Gate', budgetedAmount: '1000', actualAmount: '0', proposedAmount: '1580', comment: 'Tree Trimming on Knightsway', sortOrder: 5 },
  { section: 'expense' as const, description: 'Well Electric', budgetedAmount: '900', actualAmount: '858', proposedAmount: '900', comment: '', sortOrder: 6 },
  { section: 'expense' as const, description: 'Postage', budgetedAmount: '50', actualAmount: '0', proposedAmount: '50', comment: '', sortOrder: 7 },
  { section: 'expense' as const, description: 'Bridge Deck repair/replace', budgetedAmount: '0', actualAmount: '20122', proposedAmount: '0', comment: '', sortOrder: 8 },
  { section: 'expense' as const, description: 'Weed Control', budgetedAmount: '0', actualAmount: '0', proposedAmount: '1500', comment: 'Weed Control paid twice, no costs this year', sortOrder: 9 },
  { section: 'expense' as const, description: 'Property Taxes', budgetedAmount: '70', actualAmount: '62', proposedAmount: '70', comment: '', sortOrder: 10 },
  { section: 'expense' as const, description: 'Liability Insurance', budgetedAmount: '650', actualAmount: '623', proposedAmount: '650', comment: '', sortOrder: 11 },
  { section: 'expense' as const, description: 'Legal', budgetedAmount: '500', actualAmount: '0', proposedAmount: '500', comment: '', sortOrder: 12 },
  { section: 'expense' as const, description: 'Well Testing and Repair', budgetedAmount: '800', actualAmount: '900', proposedAmount: '800', comment: '', sortOrder: 13 },
  // Reserves
  { section: 'reserves' as const, description: 'Use of Reserves / (Provision to Reserves)', budgetedAmount: '0', actualAmount: '18995', proposedAmount: '-1000', comment: 'Pay back reserves to help with bridge costs in 2025', sortOrder: 1 },
]

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) return new Response('Forbidden', { status: 403 })

  const { year } = await req.json() as { year: number }

  // Clear existing data for this year
  await db.delete(budgetLineItems).where(eq(budgetLineItems.fiscalYear, year))

  const rows = FY2526.map(row => ({ ...row, fiscalYear: year }))
  await db.insert(budgetLineItems).values(rows)

  return Response.json({ ok: true, count: rows.length })
}
