'use server'

import { db } from '@/db'
import { users, boardMembers, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer'] as const
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

  if (!name || !email || !role) throw new Error('All fields required')
  if (!BOARD_ROLES.includes(role as BoardRole)) throw new Error('Invalid role')

  // Remove the role from whoever currently holds it
  await db
    .update(users)
    .set({ role: 'resident' })
    .where(eq(users.role, role as BoardRole))

  // Upsert the user by email
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })

  if (existing) {
    await db.update(users).set({ name, role: role as BoardRole }).where(eq(users.email, email))
  } else {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      name,
      email,
      role: role as BoardRole,
    })
  }

  await db.insert(auditLogs).values({
    action: 'board.role_assigned',
    entityType: 'user',
    performedBy: session.user.id!,
    details: { email, role, name },
  })

  revalidatePath('/members')
}
