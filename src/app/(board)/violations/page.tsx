import { db } from '@/db'
import { violations } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  under_review: 'default',
  resolved: 'secondary',
  dismissed: 'outline',
}

export default async function ViolationsPage() {
  const records = await db.query.violations.findMany({
    orderBy: desc(violations.createdAt),
    with: { reporter: true },
    limit: 50,
  })

  const openCount = records.filter((r) => r.status === 'open' || r.status === 'under_review').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Violations</h1>
        <p className="text-sm text-muted-foreground">{openCount} open</p>
      </div>

      {records.length === 0 ? (
        <p className="text-muted-foreground">No violations reported.</p>
      ) : (
        <div className="space-y-4">
          {records.map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base font-medium">{v.title}</CardTitle>
                  <Badge variant={statusColor[v.status ?? 'open']}>{v.status?.replace('_', ' ')}</Badge>
                </div>
                <CardDescription>
                  Reported by {v.reporter?.name ?? v.reporter?.email}
                  {' · '}{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ''}
                </CardDescription>
              </CardHeader>
              {v.description && (
                <CardContent>
                  <p className="text-sm">{v.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
