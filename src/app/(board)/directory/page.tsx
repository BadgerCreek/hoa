import { db } from '@/db'
import { users, properties, duesAssessments } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { auth, isAdmin as checkAdmin } from '@/lib/auth'
import { MemberTable } from '@/components/MemberTable'

export default async function DirectoryPage() {
  const session = await auth()
  const isAdmin = checkAdmin(session?.user?.role, session?.user?.isAdmin)
  const allUsers = await db.select().from(users).orderBy(users.name)
  const allProperties = await db.select().from(properties)
  const allDues = await db.select().from(duesAssessments).orderBy(desc(duesAssessments.dueDate))

  const propertiesByOwner = Object.fromEntries(
    allProperties.filter(p => p.ownerId).map(p => [p.ownerId!, p])
  )
  const latestDuesByProperty = allDues.reduce<Record<string, typeof allDues[0]>>((acc, d) => {
    if (!acc[d.propertyId]) acc[d.propertyId] = d
    return acc
  }, {})

  const members = allUsers.map(u => {
    const property = propertiesByOwner[u.id]
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      role: u.role ?? null,
      isAdminFlag: u.isAdmin ?? false,
      lotNumber: property?.lotNumber ?? null,
      address: property?.address ?? null,
    }
  })

  const duesByMember = Object.fromEntries(
    allUsers.map(u => {
      const property = propertiesByOwner[u.id]
      const dues = property ? latestDuesByProperty[property.id] : null
      return [u.id, dues?.status ?? null]
    })
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Member Directory</h1>
      <MemberTable members={members} duesByMember={duesByMember} isAdmin={isAdmin} />
    </div>
  )
}
