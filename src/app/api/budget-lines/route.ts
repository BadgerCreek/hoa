import { auth } from '@/lib/auth'
import { db } from '@/db'
import { budgetLineItems } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

const schema = z.object({
  fiscalYear: z.number().int(),
  section: z.enum(['income', 'expense', 'reserves']),
  description: z.string().min(1),
  budgetedAmount: z.string().optional(),
  actualAmount: z.string().optional(),
  proposedAmount: z.string().optional(),
  comment: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const year = new URL(req.url).searchParams.get('year')
  if (!year) return new Response('year required', { status: 400 })

  const lines = await db.select().from(budgetLineItems)
    .where(eq(budgetLineItems.fiscalYear, parseInt(year)))
    .orderBy(budgetLineItems.section, budgetLineItems.sortOrder)

  return Response.json(lines)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) return new Response('Forbidden', { status: 403 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid', { status: 400 })

  const [line] = await db.insert(budgetLineItems).values(parsed.data).returning()
  return Response.json({ ok: true, line })
}
