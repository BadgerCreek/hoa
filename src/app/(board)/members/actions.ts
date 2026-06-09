'use server'

import { db } from '@/db'
import { users, boardMembers, auditLogs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'board_arc'] as const
type BoardRole = typeof BOARD_ROLES[number]

export async function assignRole(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  if (userRole !== 'admin' && !userIsAdmin) throw new Error('Admin access required')

  const name = (formData.get('name') as string).trim()
  const email = (formData.get('email') as string).trim().toLowerCase()
  const role = formData.get('role') as string
  const termEnd = (formData.get('termEnd') as string | null)?.trim() || null

  if (!name || !email || !role) throw new Error('All fields required')
  if (!BOARD_ROLES.includes(role as BoardRole)) throw new Error('Invalid role')

  // Find previous holder to deactivate their term
  const previousHolder = await db.query.users.findFirst({
    where: eq(users.role, role as BoardRole),
    columns: { id: true },
  })

  // Remove the role from whoever currently holds it
  await db
    .update(users)
    .set({ role: 'resident' })
    .where(eq(users.role, role as BoardRole))

  // Deactivate previous holder's board member record
  if (previousHolder) {
    await db.update(boardMembers)
      .set({ active: false })
      .where(and(eq(boardMembers.userId, previousHolder.id), eq(boardMembers.active, true)))
  }

  // Upsert the user by email
  let newUser = await db.query.users.findFirst({ where: eq(users.email, email) })

  if (newUser) {
    await db.update(users).set({ name, role: role as BoardRole }).where(eq(users.email, email))
  } else {
    const [created] = await db.insert(users).values({
      id: crypto.randomUUID(),
      name,
      email,
      role: role as BoardRole,
    }).returning()
    newUser = created
  }

  // Upsert board member term record
  const today = new Date().toISOString().slice(0, 10)
  const existingTerm = await db.query.boardMembers.findFirst({
    where: and(eq(boardMembers.userId, newUser.id), eq(boardMembers.active, true)),
  })
  if (existingTerm) {
    await db.update(boardMembers)
      .set({ termEnd: termEnd ?? null })
      .where(eq(boardMembers.id, existingTerm.id))
  } else {
    await db.insert(boardMembers).values({
      userId: newUser.id,
      termStart: today,
      termEnd: termEnd ?? null,
      active: true,
    })
  }

  await db.insert(auditLogs).values({
    action: 'board.role_assigned',
    entityType: 'user',
    performedBy: session.user.id!,
    details: { email, role, name, termEnd },
  })

  revalidatePath('/members')
}
