'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProposalActions } from '@/components/ProposalActions'
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
  isAdmin: boolean
}

export function EditProposalCard({ proposal, tally, isAdmin }: Props) {
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
    if (!resp.ok) { setError('Failed to save'); return }
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
    <AccordionPrimitive.Root
      multiple={false}
      className="rounded-lg"
    >
      <AccordionPrimitive.Item value={proposal.id} className="border-none">
        {/* Custom header: trigger on the left, action buttons on the right */}
        <AccordionPrimitive.Header className="flex items-center px-4 py-3 gap-2 bg-muted hover:bg-muted/80 transition-colors rounded-lg data-[panel-open]:rounded-b-none">
          <AccordionPrimitive.Trigger className="group flex flex-1 items-center gap-2 min-w-0 text-left outline-none">
            {editing ? (
              <input
                className="flex-1 rounded border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm font-medium truncate">{title}</span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 group-aria-expanded:hidden" />
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 hidden group-aria-expanded:inline" />
          </AccordionPrimitive.Trigger>

          {/* These live outside the trigger so they don't toggle the accordion */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusColor[status]} className="text-xs">{status}</Badge>
            {totalVotes > 0 && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {tally.yes}Y · {tally.no}N · {tally.abstain}A
              </span>
            )}
            {isAdmin && !editing && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {isAdmin && (!confirmDelete ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
              >
                Delete
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Sure?</span>
                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={deleteProposal} disabled={deleting}>
                  {deleting ? '…' : 'Yes'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(false)}>No</Button>
              </div>
            ))}
          </div>
        </AccordionPrimitive.Header>

        <AccordionPrimitive.Panel className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
          <div className="px-4 pb-4 pt-3 bg-background rounded-b-lg">
            {proposal.agentId && (
              <p className="text-xs text-muted-foreground mb-3">Drafted by {proposal.agentId} agent</p>
            )}
            {editing ? (
              <div className="space-y-3">
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
                  <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
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
              </div>
            )}
          </div>
        </AccordionPrimitive.Panel>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  )
}
