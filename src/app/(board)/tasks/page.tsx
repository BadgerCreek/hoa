import { db } from '@/db'
import { tasks } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { auth, isAdmin as checkAdmin } from '@/lib/auth'
import { EditTaskCard } from '@/components/EditTaskCard'
import { AddTaskDialog } from '@/components/AddTaskDialog'

export default async function TasksPage() {
  const session = await auth()
  const isAdmin = checkAdmin(session?.user?.role, session?.user?.isAdmin)
  const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <AddTaskDialog />
      </div>
      {allTasks.length === 0 ? (
        <p className="text-muted-foreground">No tasks yet. Agents will create tasks when they need your approval.</p>
      ) : (
        <div className="space-y-4">
          {allTasks.map((task) => (
            <EditTaskCard key={task.id} task={task} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}
