import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tasks, users, notifications, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Badger Creek Ranch HOA <hoa@knightsway.org>'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

export async function POST(
  _req: Request,
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
  if (task.type !== 'notification') {
    return NextResponse.json({ error: 'Task is not a notification type' }, { status: 400 })
  }

  const message = task.description ?? task.title
  const residents = await db.select().from(users).where(eq(users.role, 'resident'))

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

  // Send emails
  const emailResults = await Promise.allSettled(
    residents.map((r) =>
      resend.emails.send({
        from: FROM,
        to: r.email,
        subject: task.title,
        text: message,
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
