'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(meeting.status === 'completed')
  const status = (meeting.status ?? 'scheduled') as MeetingStatus
  const hasContent = meeting.minutes || meeting.transcript || meeting.tasks.length > 0

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-start justify-between gap-4 px-4 py-3 ${hasContent ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}`}
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
        <div className="border-t px-4 py-4">
          <Tabs defaultValue={meeting.minutes ? 'minutes' : meeting.tasks.length ? 'actions' : 'transcript'}>
            <TabsList className="mb-4">
              {meeting.minutes && <TabsTrigger value="minutes">Minutes</TabsTrigger>}
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

            {meeting.minutes && (
              <TabsContent value="minutes" className="mt-0">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed bg-muted/30 rounded-md p-4">
                    {meeting.minutes}
                  </pre>
                </div>
              </TabsContent>
            )}

            {meeting.tasks.length > 0 && (
              <TabsContent value="actions" className="mt-0 space-y-3">
                {meeting.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No action items extracted.</p>
                ) : (
                  meeting.tasks.map(task => (
                    <EditTaskCard key={task.id} task={task} />
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
