'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type VoteType = 'yes' | 'no' | 'abstain'
type Tally = { yes: number; no: number; abstain: number }

export function VoteButtons({
  proposalId,
  initialVote,
  initialTally,
}: {
  proposalId: string
  initialVote: VoteType | null
  initialTally: Tally
}) {
  const [vote, setVote] = useState<VoteType | null>(initialVote)
  const [tally, setTally] = useState<Tally>(initialTally)
  const [loading, setLoading] = useState(false)

  async function handleVote(v: VoteType) {
    if (loading) return
    const prev = vote
    const prevTally = { ...tally }
    setLoading(true)

    // Optimistic update
    setVote(v)
    if (v !== prev) {
      setTally(t => ({
        ...t,
        ...(prev ? { [prev]: Math.max(0, t[prev] - 1) } : {}),
        [v]: t[v] + 1,
      }))
    }

    const resp = await fetch(`/api/proposals/${proposalId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: v }),
    })

    if (!resp.ok) {
      setVote(prev)
      setTally(prevTally)
    } else {
      const data = await resp.json()
      setTally(data.tally)
    }
    setLoading(false)
  }

  const total = tally.yes + tally.no + tally.abstain

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={vote === 'yes' ? 'default' : 'outline'}
          onClick={() => handleVote('yes')}
          disabled={loading}
        >
          Yes{tally.yes > 0 ? ` (${tally.yes})` : ''}
        </Button>
        <Button
          size="sm"
          variant={vote === 'no' ? 'destructive' : 'outline'}
          onClick={() => handleVote('no')}
          disabled={loading}
        >
          No{tally.no > 0 ? ` (${tally.no})` : ''}
        </Button>
        <Button
          size="sm"
          variant={vote === 'abstain' ? 'secondary' : 'ghost'}
          onClick={() => handleVote('abstain')}
          disabled={loading}
        >
          Abstain{tally.abstain > 0 ? ` (${tally.abstain})` : ''}
        </Button>
      </div>
      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          {total} vote{total !== 1 ? 's' : ''}{vote ? ` · you voted ${vote}` : ''}
        </p>
      )}
    </div>
  )
}
