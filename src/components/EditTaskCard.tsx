'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

type TaskStatus = 'pending' | 'in_progress' | 'awaiting_human' | 'approved' | 'completed' | 'rejected'

const statusColor: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  awaiting_human: 'outline',
  approved: 'default',
  completed: 'secondary',
  rejected: 'destructive',
}

const statusLabel: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  awaiting_human: 'Awaiting Approval',
  approved: 'Approved',
  completed: 'Done',
  rejected: 'Rejected',
}

type TaskType = 'schedule' | 'follow_up' | 'payment' | 'general'

function detectType(title: string, description: string | null): TaskType {
  const t = title.toLowerCase()
  const full = `${t} ${(description ?? '').toLowerCase()}`
  // Schedule: only match title — descriptions often contain "meeting" as context noise
  if (/\bschedule\b.*\bmeet|\bset.?up\b.*\bmeet|\bbook\b.*\bmeet|\borganize\b.*\bmeet/.test(t)) return 'schedule'
  if (/\bschedule\b (a |the |next )?meeting/.test(t)) return 'schedule'
  if (/\bemail\b|\bfollow.?up\b|\bcontact\b|\bnotif|\breach out\b|\bdraft\b/.test(full)) return 'follow_up'
  if (/\bpay\b|\bpayment\b|\binvoice\b|\bbid\b/.test(full)) return 'payment'
  return 'general'
}

function googleCalendarUrl(title: string, description: string | null): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `BCR HOA: ${title}`,
    details: description ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

interface Props {
  task: {
    id: string
    title: string
    description: string | null
    agentThoughts: string | null
    status: string | null
    createdByAgent: string | null
  }
}

export function EditTaskCard({ task }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)

  const status = (task.status ?? 'pending') as TaskStatus
  const taskType = detectType(task.title, task.description)

  async function approve() {
    setActing(true)
    await fetch(`/api/tasks/${task.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setActing(false)
    router.refresh()
  }

  async function reject() {
    setActing(true)
    await fetch(`/api/tasks/${task.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })
    setActing(false)
    router.refresh()
  }

  async function markDone() {
    setActing(true)
    await fetch(`/api/tasks/${task.id}/complete`, { method: 'POST' })
    setActing(false)
    router.refresh()
  }

  async function draftEmail() {
    setDraftLoading(true)
    const resp = await fetch(`/api/tasks/${task.id}/draft-email`, { method: 'POST' })
    const data = await resp.json()
    setEmailDraft(data)
    setDraftLoading(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    const resp = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })
    setSaving(false)
    if (!resp.ok) { setError('Failed to save'); return }
    setEditing(false)
    router.refresh()
  }

  return (
    <>
      <Card className={status === 'awaiting_human' ? 'border-amber-400' : status === 'approved' ? 'border-blue-400' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            {editing ? (
              <input
                className="flex-1 rounded border bg-background px-2 py-1 text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <CardTitle className="text-base font-medium">{title}</CardTitle>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={statusColor[status]}>{statusLabel[status]}</Badge>
              {!editing && status !== 'completed' && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>
          </div>
          {task.createdByAgent && (
            <p className="text-xs text-muted-foreground">Created by {task.createdByAgent} agent</p>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {editing ? (
            <>
              <textarea
                className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description (optional)"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={save} disabled={saving || !title.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                {status === 'rejected' && (
                  <Button size="sm" variant="outline" onClick={approve} disabled={acting}>
                    Re-approve
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setTitle(task.title); setDescription(task.description ?? ''); setEditing(false) }} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {description && <p className="text-sm">{description}</p>}

              {task.agentThoughts && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Agent reasoning
                  </summary>
                  <p className="mt-2 p-3 bg-muted rounded-md whitespace-pre-wrap">{task.agentThoughts}</p>
                </details>
              )}

              {/* Awaiting approval — show Approve / Reject */}
              {status === 'awaiting_human' && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={approve} disabled={acting}>Approve Task</Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={reject} disabled={acting}>Reject</Button>
                </div>
              )}

              {/* Approved — show Mark Done + smart actions */}
              {status === 'approved' && (
                <div className="flex gap-2 flex-wrap items-center">
                  <Button size="sm" onClick={markDone} disabled={acting}>Mark Done</Button>

                  {taskType === 'schedule' && (
                    <a
                      href={googleCalendarUrl(task.title, task.description)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline">+ Google Calendar</Button>
                    </a>
                  )}

                  {taskType === 'follow_up' && (
                    <Button size="sm" variant="outline" onClick={draftEmail} disabled={draftLoading}>
                      {draftLoading ? 'Drafting…' : '✉ Draft Email'}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email draft modal */}
      <Dialog open={!!emailDraft} onOpenChange={() => setEmailDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Draft</DialogTitle>
          </DialogHeader>
          {emailDraft && (
            <div className="space-y-3 py-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <p className="text-sm font-medium border rounded px-3 py-2 bg-muted">{emailDraft.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Body</p>
                <textarea
                  className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[160px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue={emailDraft.body}
                />
              </div>
              <p className="text-xs text-muted-foreground">Edit as needed, then copy and send from your email client.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDraft(null)}>Close</Button>
            <Button onClick={() => {
              navigator.clipboard.writeText(`Subject: ${emailDraft?.subject}\n\n${emailDraft?.body}`)
            }}>Copy to Clipboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
