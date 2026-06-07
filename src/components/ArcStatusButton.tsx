'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type ArcStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'needs_info'

export function ArcStatusButton({
  appId,
  currentStatus,
}: {
  appId: string
  currentStatus: ArcStatus
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function changeStatus(status: string, decision?: string) {
    setLoading(true)
    await fetch(`/api/arc/${appId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, decision }),
    })
    setLoading(false)
    router.refresh()
  }

  if (currentStatus === 'submitted') {
    return (
      <Button size="sm" variant="outline" onClick={() => changeStatus('under_review')} disabled={loading}>
        Start Review
      </Button>
    )
  }

  if (currentStatus === 'under_review') {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => changeStatus('approved')} disabled={loading}>Approve</Button>
        <Button size="sm" variant="destructive" onClick={() => changeStatus('rejected')} disabled={loading}>Reject</Button>
        <Button size="sm" variant="outline" onClick={() => changeStatus('needs_info')} disabled={loading}>Needs Info</Button>
      </div>
    )
  }

  if (currentStatus === 'needs_info') {
    return (
      <Button size="sm" variant="outline" onClick={() => changeStatus('under_review')} disabled={loading}>
        Resume Review
      </Button>
    )
  }

  return null
}
