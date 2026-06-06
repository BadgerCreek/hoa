'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function TaskApproveButton({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const router = useRouter()

  async function handle(action: 'approve' | 'reject') {
    setLoading(action)
    await fetch(`/api/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => handle('approve')}
        disabled={loading !== null}
      >
        {loading === 'approve' ? 'Approving...' : 'Approve'}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => handle('reject')}
        disabled={loading !== null}
      >
        {loading === 'reject' ? 'Rejecting...' : 'Reject'}
      </Button>
    </div>
  )
}
