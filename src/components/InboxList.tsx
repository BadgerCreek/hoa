'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Inquiry = {
  id: string
  category: 'dues' | 'general'
  message: string
  createdAt: Date | null
  from: { name: string | null; email: string } | null
}

export function InboxList({ initialInquiries }: { initialInquiries: Inquiry[] }) {
  const [inquiries, setInquiries] = useState(initialInquiries)
  const [resolving, setResolving] = useState<string | null>(null)

  async function resolve(id: string) {
    setResolving(id)
    await fetch(`/api/inquiries/${id}/resolve`, { method: 'POST' })
    setInquiries((prev) => prev.filter((i) => i.id !== id))
    setResolving(null)
  }

  if (inquiries.length === 0) {
    return <p className="text-sm text-muted-foreground">Inbox is empty.</p>
  }

  return (
    <div className="space-y-3">
      {inquiries.map((inq) => (
        <div key={inq.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={inq.category === 'dues' ? 'default' : 'secondary'} className="capitalize">
                {inq.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {inq.from?.name ?? inq.from?.email}
                {' · '}
                {inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : ''}
              </span>
            </div>
            <p className="text-sm line-clamp-2">{inq.message}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => resolve(inq.id)}
            disabled={resolving === inq.id}
            className="shrink-0"
          >
            {resolving === inq.id ? 'Resolving…' : 'Mark Resolved'}
          </Button>
        </div>
      ))}
    </div>
  )
}
