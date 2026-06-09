'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { setArcMember } from '@/app/(board)/members/actions'

export function ArcToggleButton({ userId, isArcMember }: { userId: string; isArcMember: boolean }) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    try {
      await setArcMember(userId, !isArcMember)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant={isArcMember ? 'destructive' : 'outline'}
      className="shrink-0 text-xs"
      disabled={loading}
      onClick={handleToggle}
    >
      {loading ? '…' : isArcMember ? 'Remove' : 'Add to ARC'}
    </Button>
  )
}
