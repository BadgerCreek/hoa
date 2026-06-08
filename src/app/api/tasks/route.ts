import { auth } from '@/lib/auth'
import { db } from '@/db'
import { tasks, auditLogs } from '@/db/schema'
import { z } from 'zod'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

const TASK_TYPES = ['notification', 'schedule_meeting', 'phone_call', 'get_quote', 'request_payment', 'request_invoice', 'general'] as const

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(TASK_TYPES).default('general'),
  assignedToAgentRole: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) {
    return new Response('Forbidden', { status: 403 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return new Response('Invalid data', { status: 400 })

  const [task] = await db.insert(tasks).values({
    ...parsed.data,
    status: 'awaiting_human',
  }).returning()

  await db.insert(auditLogs).values({
    action: 'task.created_manually',
    entityType: 'task',
    entityId: task.id,
    performedBy: session.user.id!,
    details: { title: task.title, type: task.type },
  })

  return Response.json({ ok: true, task })
}
