'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance Request' },
  { value: 'dues',        label: 'Dues Inquiry' },
  { value: 'violation',   label: 'Violation Report' },
  { value: 'general',     label: 'General Inquiry' },
]

export function ContactHOAButton() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, message }),
    })

    if (res.ok) {
      setStatus('success')
      setMessage('')
      setCategory('general')
    } else {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.error ?? 'Something went wrong.')
      setStatus('error')
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) {
      setStatus('idle')
      setErrorMsg('')
      setMessage('')
      setCategory('general')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
        Contact HOA
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact the HOA</DialogTitle>
        </DialogHeader>

        {status === 'success' ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm font-medium">Message sent!</p>
            <p className="text-sm text-muted-foreground">The board will follow up with you by email.</p>
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
                placeholder="Describe your issue or question..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={status === 'loading' || !message.trim()}>
                {status === 'loading' ? 'Sending…' : 'Send Message'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
