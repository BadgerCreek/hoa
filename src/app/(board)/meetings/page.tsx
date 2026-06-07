import { db } from '@/db'
import { meetings } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  scheduled: 'outline',
  completed: 'default',
  cancelled: 'destructive',
}

export default async function MeetingsPage() {
  const allMeetings = await db.select().from(meetings).orderBy(desc(meetings.scheduledAt)).limit(20)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meetings</h1>

      {allMeetings.length === 0 ? (
        <p className="text-muted-foreground">No meetings scheduled. Ask the Secretary agent to schedule one.</p>
      ) : (
        <div className="space-y-4">
          {allMeetings.map(meeting => (
            <Card key={meeting.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base font-medium">{meeting.title}</CardTitle>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="outline">{meeting.type}</Badge>
                    <Badge variant={statusColor[meeting.status ?? 'scheduled']}>{meeting.status}</Badge>
                  </div>
                </div>
                <CardDescription>
                  {meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : '—'}
                </CardDescription>
              </CardHeader>
              {meeting.agenda && (
                <CardContent>
                  <details>
                    <summary className="text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                      Agenda
                    </summary>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{meeting.agenda}</p>
                  </details>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
