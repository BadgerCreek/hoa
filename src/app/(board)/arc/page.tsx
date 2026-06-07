import { db } from '@/db'
import { arcApplications, properties, users } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArcStatusButton } from '@/components/ArcStatusButton'

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  submitted: 'secondary',
  under_review: 'outline',
  approved: 'default',
  rejected: 'destructive',
  needs_info: 'outline',
}

export default async function ArcPage() {
  const apps = await db.query.arcApplications.findMany({
    orderBy: desc(arcApplications.submittedAt),
    with: {
      applicant: true,
      property: true,
    },
    limit: 50,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Committee</h1>
          <p className="text-sm text-muted-foreground mt-1">Architectural Review Committee applications</p>
        </div>
      </div>

      {apps.length === 0 ? (
        <p className="text-muted-foreground">No applications submitted yet.</p>
      ) : (
        <div className="space-y-4">
          {apps.map(app => (
            <Card key={app.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base font-medium">{app.title}</CardTitle>
                  <Badge variant={statusColor[app.status ?? 'submitted']}>
                    {app.status?.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription>
                  {app.applicant?.name ?? app.applicant?.email}
                  {app.property?.lotNumber && ` · Lot ${app.property.lotNumber}`}
                  {app.property?.address && ` · ${app.property.address}`}
                  {' · '}Submitted {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{app.description}</p>
                {app.agentSummary && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Agent summary
                    </summary>
                    <p className="mt-2 p-3 bg-muted rounded-md whitespace-pre-wrap">{app.agentSummary}</p>
                  </details>
                )}
                {app.decision && (
                  <p className="text-sm border-l-2 pl-3 text-muted-foreground">{app.decision}</p>
                )}
                <ArcStatusButton
                  appId={app.id}
                  currentStatus={(app.status ?? 'submitted') as 'submitted' | 'under_review' | 'approved' | 'rejected' | 'needs_info'}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
