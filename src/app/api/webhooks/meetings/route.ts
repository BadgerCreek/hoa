import { Webhook } from 'svix'
import { Resend } from 'resend'
import { generateObject } from 'ai'
import { z } from 'zod'
import { db } from '@/db'
import { tasks, meetings, auditLogs } from '@/db/schema'
import { and, desc, eq, gte } from 'drizzle-orm'
import { VeniceModel } from '@/lib/venice'
import { agentPrompts } from '@/lib/agents/prompts'

const resend = new Resend(process.env.RESEND_API_KEY)

const ExtractionSchema = z.object({
  meetingTitle: z.string(),
  summary: z.string().describe('2-3 sentence executive summary of the meeting'),
  actionItems: z.array(z.object({
    title: z.string().describe('Short task title'),
    description: z.string().describe('What needs to be done and why'),
    assignedTo: z.string().optional().describe('Person responsible, if mentioned'),
  })),
  decisions: z.array(z.string()).describe('Key decisions made during the meeting'),
  attendees: z.array(z.string()).optional(),
})

function stripHtml(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function formatMinutes(extracted: z.infer<typeof ExtractionSchema>, subject: string): string {
  const lines = [
    `# ${extracted.meetingTitle || subject}`,
    '',
    `## Summary`,
    extracted.summary,
    '',
  ]

  if (extracted.attendees?.length) {
    lines.push('## Attendees', extracted.attendees.join(', '), '')
  }

  if (extracted.decisions.length) {
    lines.push('## Decisions')
    extracted.decisions.forEach(d => lines.push(`- ${d}`))
    lines.push('')
  }

  if (extracted.actionItems.length) {
    lines.push('## Action Items')
    extracted.actionItems.forEach(item => {
      lines.push(`- **${item.title}**${item.assignedTo ? ` (${item.assignedTo})` : ''}`)
      if (item.description !== item.title) lines.push(`  ${item.description}`)
    })
  }

  return lines.join('\n')
}

export async function POST(req: Request) {
  const body = await req.text()

  // Verify Svix signature from Resend
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret) {
    const wh = new Webhook(secret)
    try {
      wh.verify(body, {
        'svix-id': req.headers.get('svix-id') ?? '',
        'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
        'svix-signature': req.headers.get('svix-signature') ?? '',
      })
    } catch {
      return new Response('Invalid signature', { status: 401 })
    }
  }

  const event = JSON.parse(body)

  if (event.type !== 'email.received') {
    return Response.json({ ok: true })
  }

  const emailId: string = event.data?.email_id
  if (!emailId) return Response.json({ ok: true })

  // Fetch full email body from Resend
  let content: string
  try {
    const email = await (resend.emails as unknown as { receiving: { get: (id: string) => Promise<{ text?: string; html?: string; subject?: string }> } }).receiving.get(emailId)
    content = email.text ?? (email.html ? stripHtml(email.html) : '')
  } catch (err) {
    console.error('[meetings webhook] Failed to fetch email body:', err)
    return new Response('Failed to fetch email', { status: 500 })
  }

  if (!content || content.length < 50) {
    return Response.json({ ok: true, message: 'Email too short, skipped' })
  }

  // Extract structured data with Secretary agent
  let extracted: z.infer<typeof ExtractionSchema>
  try {
    const result = await generateObject({
      model: VeniceModel.smart,
      schema: ExtractionSchema,
      system: agentPrompts.secretary,
      prompt: `You are processing an Otter AI meeting summary for the Badger Creek Ranch HOA board.
Extract all action items, decisions, and create a clean summary.
Be specific — turn vague notes into clear, actionable tasks.

Meeting email subject: ${event.data.subject ?? 'Board Meeting'}

Full transcript/notes:
${content.slice(0, 12000)}`,
    })
    extracted = result.object
  } catch (err) {
    console.error('[meetings webhook] Agent extraction failed:', err)
    return new Response('Extraction failed', { status: 500 })
  }

  // Find the most recently scheduled meeting (within last 48 hours)
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const meeting = await db.query.meetings.findFirst({
    where: and(
      eq(meetings.status, 'scheduled'),
      gte(meetings.scheduledAt, cutoff)
    ),
    orderBy: desc(meetings.scheduledAt),
  })

  const minutes = formatMinutes(extracted, event.data.subject ?? 'Board Meeting')

  // Mark meeting completed and save minutes
  if (meeting) {
    await db.update(meetings)
      .set({ status: 'completed', minutes })
      .where(eq(meetings.id, meeting.id))
  }

  // Create tasks for each action item
  for (const item of extracted.actionItems) {
    const description = [
      item.description,
      item.assignedTo ? `Assigned to: ${item.assignedTo}` : null,
      `\nFrom meeting: ${extracted.meetingTitle}`,
    ].filter(Boolean).join('\n')

    await db.insert(tasks).values({
      title: item.title,
      description,
      status: 'awaiting_human',
      agentThoughts: `Extracted from Otter AI meeting notes.\n\nKey decisions:\n${extracted.decisions.map(d => `• ${d}`).join('\n')}\n\nSummary: ${extracted.summary}`,
      createdByAgent: 'secretary',
      assignedToAgentRole: 'secretary',
    })
  }

  await db.insert(auditLogs).values({
    action: 'meeting.notes_imported',
    entityType: 'meeting',
    entityId: meeting?.id ?? null,
    performedBy: 'secretary',
    details: {
      emailId,
      subject: event.data.subject,
      meetingTitle: extracted.meetingTitle,
      tasksCreated: extracted.actionItems.length,
      decisionsRecorded: extracted.decisions.length,
    },
  })

  console.log(`[meetings webhook] Processed: "${extracted.meetingTitle}" — ${extracted.actionItems.length} tasks created`)
  return Response.json({ ok: true, tasksCreated: extracted.actionItems.length })
}
