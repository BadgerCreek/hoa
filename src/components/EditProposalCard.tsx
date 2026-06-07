'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProposalActions } from '@/components/ProposalActions'

type Status = 'draft' | 'open' | 'closed' | 'approved' | 'rejected'

const statusColor: Record<Status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  open: 'default',
  closed: 'secondary',
  approved: 'default',
  rejected: 'destructive',
}

interface Props {
  proposal: {
    id: string
    title: string
    content: string
    status: string | null
    agentId: string | null
  }
  tally: { yes: number; no: number; abstain: number }
}

export function EditProposalCard({ proposal, tally }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(proposal.title)
  const [content, setContent] = useState(proposal.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const status = (proposal.status ?? 'draft') as Status
  const totalVotes = tally.yes + tally.no + tally.abstain

  async function save() {
    setSaving(true)
    setError('')
    const resp = await fetch(`/api/proposals/${proposal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })
    setSaving(false)
    if (!resp.ok) {
      setError('Failed to save')
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function deleteProposal() {
    setDeleting(true)
    await fetch(`/api/proposals/${proposal.id}`, { method: 'DELETE' })
    setDeleting(false)
    router.refresh()
  }

  function cancel() {
    setTitle(proposal.title)
    setContent(proposal.content)
    setEditing(false)
    setError('')
  }

  return (
    <Card>
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
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Badge variant={statusColor[status]}>{status}</Badge>
            {!editing && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
            )}
            {!confirmDelete ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
              >
                Delete
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Sure?</span>
                <Button size="sm" variant="destructive" onClick={deleteProposal} disabled={deleting}>
                  {deleting ? '…' : 'Yes'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>No</Button>
              </div>
            )}
          </div>
        </div>
        {proposal.agentId && (
          <CardDescription>Drafted by {proposal.agentId} agent</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <textarea
              className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[50vh] resize-y"
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving || !title.trim() || !content.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{content}</p>
            {totalVotes > 0 && (
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="text-green-600 dark:text-green-400">Yes: {tally.yes}</span>
                <span className="text-red-600 dark:text-red-400">No: {tally.no}</span>
                <span>Abstain: {tally.abstain}</span>
                <span className="ml-auto">{totalVotes} total</span>
              </div>
            )}
            <ProposalActions proposalId={proposal.id} currentStatus={status} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
