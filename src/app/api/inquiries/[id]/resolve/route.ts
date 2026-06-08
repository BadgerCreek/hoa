import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { inquiries } from '@/db/schema'
import { eq } from 'drizzle-orm'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!role || !BOARD_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  await db
    .update(inquiries)
    .set({ status: 'resolved', resolvedBy: session.user.id, resolvedAt: new Date() })
    .where(eq(inquiries.id, id))

  return NextResponse.json({ ok: true })
}
