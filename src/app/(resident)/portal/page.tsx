import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { proposals, votes } from '@/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { SignOutButton } from '@/components/SignOutButton'
import { VoteButtons } from '@/components/VoteButtons'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

export default async function ResidentPortalPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user as { role?: string }).role
  const isBoardMember = role && BOARD_ROLES.includes(role)

  const openProposals = await db
    .select()
    .from(proposals)
    .where(eq(proposals.status, 'open'))
    .orderBy(desc(proposals.createdAt))
    .limit(10)

  const proposalIds = openProposals.map(p => p.id)
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

  function getUserVote(proposalId: string) {
    const userId = session?.user?.id
    return (allVotes.find(v => v.proposalId === proposalId && v.voterId === userId)?.vote ?? null) as 'yes' | 'no' | 'abstain' | null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">Badger Creek Ranch HOA</h1>
          <p className="text-xs text-muted-foreground">Resident Portal</p>
        </div>
        <div className="flex items-center gap-4">
          {isBoardMember && (
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Board Portal →
            </Link>
          )}
          <span className="text-sm">{session.user?.name}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold">Welcome back, {session.user?.name?.split(' ')[0]}</h2>
          <p className="text-sm text-muted-foreground mt-1">Stay up to date with your HOA</p>
        </div>

        <section>
          <h3 className="text-base font-semibold mb-3">Board Members</h3>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">Meet your Badger Creek Ranch HOA board.</p>
              <Link href="/board-members">
                <Button variant="outline" size="sm">View Board Members</Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        <section>
          <h3 className="text-base font-semibold mb-3">Open for Vote</h3>
          {openProposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open proposals at the moment.</p>
          ) : (
            <div className="space-y-3">
              {openProposals.map((proposal) => (
                <Card key={proposal.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{proposal.title}</CardTitle>
                      <Badge>Open</Badge>
                    </div>
                    {proposal.agentId && (
                      <CardDescription>Drafted by {proposal.agentId} agent</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">{proposal.content}</p>
                    <VoteButtons
                      proposalId={proposal.id}
                      initialVote={getUserVote(proposal.id)}
                      initialTally={getTally(proposal.id)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-base font-semibold mb-3">Community Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Next Board Meeting</CardTitle>
                <CardDescription>Date TBD — check back for updates</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Submit an Issue</CardTitle>
                <CardDescription>Coming soon — maintenance request portal</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
