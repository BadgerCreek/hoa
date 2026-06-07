import { db } from '@/db'
import { proposals, votes } from '@/db/schema'
import { desc, inArray } from 'drizzle-orm'
import { EditProposalCard } from '@/components/EditProposalCard'

export default async function ProposalsPage() {
  const allProposals = await db.select().from(proposals).orderBy(desc(proposals.createdAt)).limit(50)

  const proposalIds = allProposals.map(p => p.id)
  const allVotes = proposalIds.length > 0
    ? await db.select().from(votes).where(inArray(votes.proposalId, proposalIds))
    : []

  function getTally(proposalId: string) {
    const pvotes = allVotes.filter(v => v.proposalId === proposalId)
    return {
      yes: pvotes.filter(v => v.vote === 'yes').length,
      no: pvotes.filter(v => v.vote === 'no').length,
      abstain: pvotes.filter(v => v.vote === 'abstain').length,
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Proposals</h1>
      {allProposals.length === 0 ? (
        <p className="text-muted-foreground">No proposals yet. Ask an AI agent to draft one.</p>
      ) : (
        <div className="space-y-4">
          {allProposals.map((proposal) => (
            <EditProposalCard
              key={proposal.id}
              proposal={proposal}
              tally={getTally(proposal.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
