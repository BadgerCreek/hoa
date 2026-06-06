import { db } from '@/db'
import { tasks } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TaskApproveButton } from '@/components/TaskApproveButton'

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  awaiting_human: 'outline',
  completed: 'default',
  rejected: 'destructive',
}

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
            <Card key={task.id} className={task.status === 'awaiting_human' ? 'border-amber-400' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base font-medium">{task.title}</CardTitle>
                  <Badge variant={statusColor[task.status ?? 'pending']}>
                    {task.status?.replace('_', ' ')}
                  </Badge>
                </div>
                {task.createdByAgent && (
                  <p className="text-xs text-muted-foreground">Created by {task.createdByAgent} agent</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {task.description && <p className="text-sm">{task.description}</p>}
                {task.agentThoughts && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Agent reasoning
                    </summary>
                    <p className="mt-2 p-3 bg-muted rounded-md whitespace-pre-wrap">{task.agentThoughts}</p>
                  </details>
                )}
                {task.status === 'awaiting_human' && (
                  <TaskApproveButton taskId={task.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
