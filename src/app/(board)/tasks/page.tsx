import { db } from '@/db'
import { tasks } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { EditTaskCard } from '@/components/EditTaskCard'

export default async function TasksPage() {
  const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tasks</h1>
      {allTasks.length === 0 ? (
        <p className="text-muted-foreground">No tasks yet. Agents will create tasks when they need your approval.</p>
      ) : (
        <div className="space-y-4">
          {allTasks.map((task) => (
            <EditTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
