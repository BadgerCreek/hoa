import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, users, notifications, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Badger Creek Ranch HOA <hoa@knightsway.org>'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const subject = (body.title as string | undefined)?.trim() || task.title
  const message = (body.body as string | undefined)?.trim() || task.description || task.title
  const recipientId = body.recipientId as string | undefined

  const allUsers = await db.select().from(users)
  const residents = recipientId ? allUsers.filter(u => u.id === recipientId) : allUsers
  if (residents.length === 0) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

  // Create in-app notifications
  if (residents.length > 0) {
    await db.insert(notifications).values(
      residents.map((r) => ({
        userId: r.id,
        type: 'hoa_notice' as const,
        message,
        read: false,
      }))
    )
  }

  // Convert plain text to simple HTML (linkifies URLs, preserves line breaks)
  const html = message
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>')
    .replace(/\n/g, '<br>')

  // Send emails
  const emailResults = await Promise.allSettled(
    residents.map((r) =>
      resend.emails.send({
        from: FROM,
        to: r.email,
        subject,
        text: message,
        html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.6">${html}</div>`,
      })
    )
  )

  const sent = emailResults.filter((r) => r.status === 'fulfilled').length

  // Mark task completed
  await db.update(tasks)
    .set({ status: 'completed', completedBy: session.user.id, updatedAt: new Date() })
    .where(eq(tasks.id, id))

  await db.insert(auditLogs).values({
    action: 'task.notification_sent',
    entityType: 'task',
    entityId: id,
    performedBy: session.user.id!,
    details: { recipientCount: residents.length, emailsSent: sent },
  })

  return NextResponse.json({ ok: true, sent, total: residents.length })
}
