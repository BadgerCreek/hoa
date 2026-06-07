'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

const TASK_TYPES = [
  { value: 'general',          label: 'General' },
  { value: 'notification',     label: 'Notification' },
  { value: 'schedule_meeting', label: 'Schedule Meeting' },
  { value: 'phone_call',       label: 'Phone Call' },
  { value: 'get_quote',        label: 'Get Quote' },
  { value: 'request_payment',  label: 'Request Payment' },
  { value: 'request_invoice',  label: 'Request Invoice' },
]

const AGENT_ROLES = [
  { value: '',            label: 'None' },
  { value: 'treasurer',  label: 'Treasurer' },
  { value: 'president',  label: 'President' },
  { value: 'vp',         label: 'Vice President' },
  { value: 'secretary',  label: 'Secretary' },
]

export function AddTaskDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('general')
  const [description, setDescription] = useState('')
  const [agentRole, setAgentRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        type,
        description: description.trim() || undefined,
        assignedToAgentRole: agentRole || undefined,
      }),
    })

    setSaving(false)
    if (!res.ok) { setError('Failed to create task.'); return }

    setOpen(false)
    setTitle('')
    setType('general')
    setDescription('')
    setAgentRole('')
    router.refresh()
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) { setError('') }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors">
        <Plus className="h-4 w-4" />
        New Task
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-type">Type</Label>
            <select
              id="task-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {TASK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={type === 'notification' ? 5 : 3}
              placeholder={type === 'notification' ? 'Write the message to send to residents…' : 'Optional details…'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-agent">Assign to Agent</Label>
            <select
              id="task-agent"
              value={agentRole}
              onChange={(e) => setAgentRole(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {AGENT_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Creating…' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
