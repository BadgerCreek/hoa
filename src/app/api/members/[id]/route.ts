import { auth } from '@/lib/auth'
import { db } from '@/db'
import { users, properties, auditLogs, duesAssessments } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['resident', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']).optional(),
  lotNumber: z.string().optional(),
  address: z.string().optional(),
  duesStatus: z.enum(['pending', 'paid', 'late', 'waived']).optional(),
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
  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid data', { status: 400 })

  const { lotNumber, address, duesStatus, ...userFields } = parsed.data

  if (Object.keys(userFields).length > 0) {
    await db.update(users).set(userFields).where(eq(users.id, id))
  }

  // Upsert property if lot/address provided
  let property = await db.query.properties.findFirst({ where: eq(properties.ownerId, id) })
  if (lotNumber !== undefined || address !== undefined) {
    if (property) {
      await db.update(properties)
        .set({ ...(lotNumber !== undefined && { lotNumber }), ...(address !== undefined && { address }) })
        .where(eq(properties.ownerId, id))
    } else {
      // Create property even with just a lot number
      const [created] = await db.insert(properties).values({
        ownerId: id,
        address: address ?? '',
        lotNumber,
      }).returning()
      property = created
    }
  }

  // Update or create dues assessment
  if (duesStatus && property) {
    const existing = await db.query.duesAssessments.findFirst({
      where: eq(duesAssessments.propertyId, property.id),
      orderBy: desc(duesAssessments.dueDate),
    })
    if (existing) {
      await db.update(duesAssessments)
        .set({ status: duesStatus, ...(duesStatus === 'paid' && { paidAt: new Date() }) })
        .where(eq(duesAssessments.id, existing.id))
    } else {
      await db.insert(duesAssessments).values({
        propertyId: property.id,
        amount: '0',
        dueDate: new Date().toISOString().split('T')[0],
        period: 'annual',
        status: duesStatus,
        ...(duesStatus === 'paid' && { paidAt: new Date() }),
      })
    }
  }

  await db.insert(auditLogs).values({
    action: 'member.edited',
    entityType: 'user',
    entityId: id,
    performedBy: session.user.id!,
    details: { fields: Object.keys(parsed.data) },
  })

  return Response.json({ ok: true })
}

export async function DELETE(
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

  if (id === session.user.id) {
    return new Response('Cannot delete your own account', { status: 400 })
  }

  // Null out property ownership before deleting user (no cascade on ownerId)
  await db.update(properties).set({ ownerId: null }).where(eq(properties.ownerId, id))
  await db.delete(users).where(eq(users.id, id))

  await db.insert(auditLogs).values({
    action: 'member.deleted',
    entityType: 'user',
    entityId: id,
    performedBy: session.user.id!,
    details: {},
  })

  return Response.json({ ok: true })
}
