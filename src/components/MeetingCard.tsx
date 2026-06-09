'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { EditTaskCard } from '@/components/EditTaskCard'

type MeetingStatus = 'scheduled' | 'completed' | 'cancelled'

interface Task {
  id: string
  title: string
  description: string | null
  agentThoughts: string | null
  status: string | null
  type: string | null
  createdByAgent: string | null
}

interface Meeting {
  id: string
  title: string
  scheduledAt: Date
  type: string | null
  status: string | null
  agenda: string | null
  minutes: string | null
  transcript: string | null
  tasks: Task[]
}

const statusColor: Record<MeetingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  scheduled: 'outline',
  completed: 'default',
  cancelled: 'destructive',
}

export function MeetingCard({ meeting, isAdmin }: { meeting: Meeting; isAdmin: boolean }) {
  const [open, setOpen] = useState(meeting.status === 'completed')
  const [editingMinutes, setEditingMinutes] = useState(false)
  const [minutesDraft, setMinutesDraft] = useState(meeting.minutes ?? '')
  const [savedMinutes, setSavedMinutes] = useState(meeting.minutes ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setSavedMinutes(meeting.minutes ?? '')
    if (!editingMinutes) {
      setMinutesDraft(meeting.minutes ?? '')
    }
  }, [meeting.minutes])
  const status = (meeting.status ?? 'scheduled') as MeetingStatus
  const hasContent = savedMinutes || meeting.transcript || meeting.tasks.length > 0

  async function saveMinutes() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: minutesDraft }),
      })
      if (!res.ok) {
        setSaveError(`Save failed (${res.status}). Try again.`)
        return
      }
      setSavedMinutes(minutesDraft)
      setEditingMinutes(false)
    } catch {
      setSaveError('Network error. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-start justify-between gap-4 px-4 py-3 rounded-lg ${hasContent ? 'cursor-pointer bg-muted hover:bg-muted/80 transition-colors' : 'bg-muted'}`}
        onClick={() => hasContent && setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{meeting.title}</span>
            <Badge variant="outline" className="text-xs">{meeting.type}</Badge>
            <Badge variant={statusColor[status]} className="text-xs">{status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(meeting.scheduledAt).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </p>
        </div>
        {hasContent && (
          <span className="text-muted-foreground text-xs mt-0.5">{open ? '▲' : '▼'}</span>
        )}
      </div>

      {/* Agenda (always visible if set) */}
      {meeting.agenda && !open && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{meeting.agenda}</p>
        </div>
      )}

      {/* Tabbed content */}
      {open && hasContent && (
        <div className="px-4 py-4">
          <Tabs defaultValue={savedMinutes ? 'minutes' : meeting.tasks.length ? 'actions' : 'transcript'}>
            <TabsList className="mb-4">
              {savedMinutes && <TabsTrigger value="minutes">Minutes</TabsTrigger>}
              {meeting.tasks.length > 0 && (
                <TabsTrigger value="actions">
                  Action Items
                  {meeting.tasks.filter(t => t.status === 'awaiting_human').length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] w-4 h-4">
                      {meeting.tasks.filter(t => t.status === 'awaiting_human').length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              {meeting.transcript && <TabsTrigger value="transcript">Transcript</TabsTrigger>}
            </TabsList>

            {savedMinutes && (
              <TabsContent value="minutes" className="mt-0">
                {editingMinutes ? (
                  <div className="space-y-3">
                    <Textarea
                      value={minutesDraft}
                      onChange={e => setMinutesDraft(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveMinutes} disabled={saving}>
                          {saving ? 'Saving…' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setMinutesDraft(savedMinutes); setEditingMinutes(false); setSaveError(null) }}>
                          Cancel
                        </Button>
                      </div>
                      {saveError && (
                        <p className="text-sm text-destructive">{saveError}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed bg-muted/30 rounded-md p-4">
                      {savedMinutes}
                    </pre>
                    <Button size="sm" variant="outline" onClick={() => setEditingMinutes(true)}>
                      Edit minutes
                    </Button>
                  </div>
                )}
              </TabsContent>
            )}

            {meeting.tasks.length > 0 && (
              <TabsContent value="actions" className="mt-0 space-y-3">
                {meeting.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No action items extracted.</p>
                ) : (
                  meeting.tasks.map(task => (
                    <EditTaskCard key={task.id} task={task} isAdmin={isAdmin} />
                  ))
                )}
              </TabsContent>
            )}

            {meeting.transcript && (
              <TabsContent value="transcript" className="mt-0">
                <pre className="whitespace-pre-wrap text-xs font-mono bg-muted/30 rounded-md p-4 max-h-[500px] overflow-y-auto leading-relaxed">
                  {meeting.transcript}
                </pre>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  )
}
