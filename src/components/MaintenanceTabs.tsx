'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Request = {
  id: string
  title: string
  description: string | null
  category: string | null
  priority: string | null
  status: string | null
  source: string | null
  vendorNotes: string | null
  createdAt: Date | null
  submitter: { name: string | null; email: string } | null
}

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

function RequestList({ items }: { items: Request[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No requests.</p>
  }
  return (
    <div className="space-y-4">
      {items.map((req) => (
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
  )
}

export function MaintenanceTabs({ requests }: { requests: Request[] }) {
  const portalRequests = requests.filter((r) => r.source === 'portal')

  return (
    <Tabs defaultValue="all">
      <TabsList className="mb-4">
        <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
        <TabsTrigger value="requests">
          Requests ({portalRequests.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <RequestList items={requests} />
      </TabsContent>
      <TabsContent value="requests">
        <RequestList items={portalRequests} />
      </TabsContent>
    </Tabs>
  )
}
