import { db } from '@/db'
import { maintenanceRequests } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { MaintenanceTabs } from '@/components/MaintenanceTabs'

export default async function MaintenancePage() {
  const requests = await db.query.maintenanceRequests.findMany({
    orderBy: desc(maintenanceRequests.createdAt),
    with: { submitter: true },
    limit: 50,
  })

  const openCount = requests.filter((r) => r.status === 'open').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <p className="text-sm text-muted-foreground">{openCount} open</p>
      </div>
      <MaintenanceTabs requests={requests} />
    </div>
  )
}
