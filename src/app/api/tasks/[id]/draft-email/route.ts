import { auth } from '@/lib/auth'
import { db } from '@/db'
import { tasks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { generateText } from 'ai'
import { VeniceModel } from '@/lib/venice'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'board_arc', 'admin']

export async function POST(
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
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) })
  if (!task) return new Response('Not found', { status: 404 })

  const { text } = await generateText({
    model: VeniceModel.fast,
    system: `You are the Secretary for Badger Creek Ranch HOA.
Write professional, concise emails on behalf of the board.
Format your response as:
SUBJECT: <subject line>
---
<email body>`,
    prompt: `Draft an email for this HOA task:
Title: ${task.title}
Details: ${task.description ?? ''}
Agent notes: ${task.agentThoughts ?? ''}

Write a professional email appropriate for HOA board correspondence. Keep it brief and action-oriented.`,
  })

  const [subjectLine, ...bodyLines] = text.split('---')
  const subject = subjectLine.replace('SUBJECT:', '').trim()
  const body = bodyLines.join('---').trim()

  return Response.json({ subject, body })
}
