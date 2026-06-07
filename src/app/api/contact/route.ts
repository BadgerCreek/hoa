import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { db } from '@/db'
import { maintenanceRequests, violations, inquiries } from '@/db/schema'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Badger Creek Ranch HOA <hoa@knightsway.org>'
const HOA_EMAIL = 'hoa@knightsway.org'

const CATEGORY_LABELS: Record<string, string> = {
  maintenance: 'Maintenance Request',
  dues: 'Dues Inquiry',
  violation: 'Violation Report',
  general: 'General Inquiry',
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category, message } = await req.json()

  if (!category || !message?.trim()) {
    return NextResponse.json({ error: 'Category and message are required.' }, { status: 400 })
  }

  const label = CATEGORY_LABELS[category] ?? category
  const userId = session.user.id
  const userName = session.user?.name ?? 'A resident'
  const userEmail = session.user?.email ?? ''

  // Create DB record per category
  if (category === 'maintenance') {
    await db.insert(maintenanceRequests).values({
      submittedBy: userId,
      title: 'Maintenance Request',
      description: message.trim(),
      source: 'portal',
      status: 'open',
    })
  } else if (category === 'violation') {
    await db.insert(violations).values({
      reportedBy: userId,
      title: 'Violation Report',
      description: message.trim(),
      status: 'open',
    })
  } else if (category === 'dues' || category === 'general') {
    await db.insert(inquiries).values({
      fromUserId: userId,
      category: category as 'dues' | 'general',
      message: message.trim(),
      status: 'open',
    })
  }

  // Always send email
  const { error } = await resend.emails.send({
    from: FROM,
    to: HOA_EMAIL,
    replyTo: userEmail || undefined,
    subject: `[${label}] from ${userName}`,
    text: `From: ${userName} <${userEmail}>\nCategory: ${label}\n\n${message.trim()}`,
  })

  if (error) {
    console.error('Resend error:', error)
    // DB record already created — don't fail the whole request
  }

  return NextResponse.json({ ok: true })
}
