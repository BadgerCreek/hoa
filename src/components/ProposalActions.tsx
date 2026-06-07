'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Status = 'draft' | 'open' | 'closed' | 'approved' | 'rejected'

export function ProposalActions({
  proposalId,
  currentStatus,
}: {
  proposalId: string
  currentStatus: Status
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function changeStatus(status: string) {
    setLoading(true)
    await fetch(`/api/proposals/${proposalId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    router.refresh()
  }

  if (currentStatus === 'draft') {
    return (
      <Button size="sm" variant="outline" onClick={() => changeStatus('open')} disabled={loading}>
        Open for Voting
      </Button>
    )
  }

  if (currentStatus === 'open') {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => changeStatus('approved')} disabled={loading}>
          Approve
        </Button>
        <Button size="sm" variant="destructive" onClick={() => changeStatus('rejected')} disabled={loading}>
          Reject
        </Button>
        <Button size="sm" variant="outline" onClick={() => changeStatus('closed')} disabled={loading}>
          Close Voting
        </Button>
      </div>
    )
  }

  return null
}
