'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TaskApproveButton } from '@/components/TaskApproveButton'

type TaskStatus = 'pending' | 'in_progress' | 'awaiting_human' | 'completed' | 'rejected'

const statusColor: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  awaiting_human: 'outline',
  completed: 'default',
  rejected: 'destructive',
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
  const [error, setError] = useState('')

  const status = (task.status ?? 'pending') as TaskStatus

  async function save() {
    setSaving(true)
    setError('')
    const resp = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })
    setSaving(false)
    if (!resp.ok) {
      setError('Failed to save')
      return
    }
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setEditing(false)
    setError('')
  }

  return (
    <Card className={status === 'awaiting_human' ? 'border-amber-400' : ''}>
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
            <Badge variant={statusColor[status]}>
              {status.replace('_', ' ')}
            </Badge>
            {!editing && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
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
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving || !title.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
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
            {status === 'awaiting_human' && <TaskApproveButton taskId={task.id} />}
          </>
        )}
      </CardContent>
    </Card>
  )
}
