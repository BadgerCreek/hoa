import { db } from '@/db'
import { proposals, votes } from '@/db/schema'
import { desc, eq, count } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  open: 'default',
  closed: 'secondary',
  approved: 'default',
  rejected: 'destructive',
}

export default async function ProposalsPage() {
  const allProposals = await db.select().from(proposals).orderBy(desc(proposals.createdAt)).limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Proposals</h1>
      {allProposals.length === 0 ? (
        <p className="text-muted-foreground">No proposals yet. Ask an AI agent to draft one.</p>
      ) : (
        <div className="space-y-4">
          {allProposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base font-medium">{proposal.title}</CardTitle>
                  <Badge variant={statusColor[proposal.status ?? 'draft']}>
                    {proposal.status}
                  </Badge>
                </div>
                {proposal.agentId && (
                  <CardDescription>Drafted by {proposal.agentId} agent</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{proposal.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
