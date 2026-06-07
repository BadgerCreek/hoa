import { db } from '@/db'
import { maintenanceRequests, users } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'outline',
  in_progress: 'default',
  resolved: 'secondary',
  closed: 'secondary',
}

const priorityColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'secondary',
  medium: 'outline',
  high: 'default',
  urgent: 'destructive',
}

export default async function MaintenancePage() {
  const requests = await db.query.maintenanceRequests.findMany({
    orderBy: desc(maintenanceRequests.createdAt),
    with: { submitter: true },
    limit: 50,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <p className="text-sm text-muted-foreground">{requests.filter(r => r.status === 'open').length} open</p>
      </div>

      {requests.length === 0 ? (
        <p className="text-muted-foreground">No maintenance requests yet.</p>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <Card key={req.id} className={req.priority === 'urgent' ? 'border-red-500' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base font-medium">{req.title}</CardTitle>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant={priorityColor[req.priority ?? 'medium']}>{req.priority}</Badge>
                    <Badge variant={statusColor[req.status ?? 'open']}>{req.status?.replace('_', ' ')}</Badge>
                  </div>
                </div>
                <CardDescription>
                  {req.submitter?.name ?? req.submitter?.email}
                  {' · '}{req.category?.replace('_', ' ')}
                  {' · '}{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}
                </CardDescription>
              </CardHeader>
              {(req.description || req.vendorNotes) && (
                <CardContent className="space-y-2">
                  {req.description && <p className="text-sm">{req.description}</p>}
                  {req.vendorNotes && (
                    <p className="text-xs text-muted-foreground border-l-2 pl-3">{req.vendorNotes}</p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
