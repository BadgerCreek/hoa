import { db } from '@/db'
import { meetings, tasks } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { auth, isAdmin as checkAdmin } from '@/lib/auth'
import { MeetingCard } from '@/components/MeetingCard'

export default async function MeetingsPage() {
  const session = await auth()
  const isAdmin = checkAdmin(session?.user?.role, session?.user?.isAdmin)
  const allMeetings = await db.select().from(meetings).orderBy(desc(meetings.scheduledAt)).limit(20)

  const allTasks = allMeetings.length > 0
    ? await db.select().from(tasks).where(
        // get all tasks that have a meetingId matching any of our meetings
        // using a simple query since we don't have a FK relation
        eq(tasks.createdByAgent, 'secretary')
      ).orderBy(tasks.createdAt)
    : []

  const meetingsWithTasks = allMeetings.map(meeting => ({
    ...meeting,
    scheduledAt: new Date(meeting.scheduledAt),
    tasks: allTasks.filter(t => t.meetingId === meeting.id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meetings</h1>
        <p className="text-sm text-muted-foreground">{allMeetings.length} meetings</p>
      </div>

      {meetingsWithTasks.length === 0 ? (
        <p className="text-muted-foreground">
          No meetings yet. They&apos;ll appear automatically when Otter AI processes your meeting notes.
        </p>
      ) : (
        <div className="space-y-3">
          {meetingsWithTasks.map(meeting => (
            <MeetingCard key={meeting.id} meeting={meeting} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}
