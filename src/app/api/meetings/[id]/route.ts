import { auth } from '@/lib/auth'
import { db } from '@/db'
import { meetings, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userRole = (session?.user as { role?: string })?.role ?? null
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin ?? false

  if (!userRole || (!BOARD_ROLES.includes(userRole) && !isAdmin)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { minutes } = body

  if (typeof minutes !== 'string') {
    return new Response('Invalid body', { status: 400 })
  }

  await db.update(meetings).set({ minutes }).where(eq(meetings.id, id))

  await db.insert(auditLogs).values({
    action: 'update_minutes',
    entityType: 'meeting',
    entityId: id,
    performedBy: session!.user!.id!,
    details: {},
  })

  return new Response(null, { status: 204 })
}
