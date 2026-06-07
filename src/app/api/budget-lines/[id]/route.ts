import { auth } from '@/lib/auth'
import { db } from '@/db'
import { budgetLineItems } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getPermissions, hasPermission } from '@/lib/permissions'

const schema = z.object({
  description: z.string().min(1).optional(),
  budgetedAmount: z.string().nullable().optional(),
  actualAmount: z.string().nullable().optional(),
  proposedAmount: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  const perms = await getPermissions()
  if (!hasPermission(perms['budget.manage'], userRole, userIsAdmin)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { id } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid', { status: 400 })

  const [updated] = await db.update(budgetLineItems)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(budgetLineItems.id, id))
    .returning()

  return Response.json({ ok: true, line: updated })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  const perms = await getPermissions()
  if (!hasPermission(perms['budget.manage'], userRole, userIsAdmin)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { id } = await params
  await db.delete(budgetLineItems).where(eq(budgetLineItems.id, id))
  return Response.json({ ok: true })
}
