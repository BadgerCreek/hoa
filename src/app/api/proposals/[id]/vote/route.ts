import { auth } from '@/lib/auth'
import { db } from '@/db'
import { proposals, votes } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const voteSchema = z.object({
  vote: z.enum(['yes', 'no', 'abstain']),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const { id: proposalId } = await params
  const body = await req.json()
  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) return new Response('Invalid vote', { status: 400 })

  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, proposalId),
  })
  if (!proposal) return new Response('Not found', { status: 404 })
  if (proposal.status !== 'open') {
    return new Response('Proposal not open for voting', { status: 400 })
  }

  // Upsert: delete existing vote from this user then insert new
  await db.delete(votes).where(
    and(eq(votes.proposalId, proposalId), eq(votes.voterId, session.user.id!))
  )
  await db.insert(votes).values({
    proposalId,
    voterId: session.user.id!,
    vote: parsed.data.vote,
  })

  const allVotes = await db.select().from(votes).where(eq(votes.proposalId, proposalId))
  const tally = {
    yes: allVotes.filter(v => v.vote === 'yes').length,
    no: allVotes.filter(v => v.vote === 'no').length,
    abstain: allVotes.filter(v => v.vote === 'abstain').length,
  }

  return Response.json({ ok: true, vote: parsed.data.vote, tally })
}
