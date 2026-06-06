import { db } from '@/db'
import { users, boardMembers } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AssignRoleForm } from '@/components/AssignRoleForm'

const BOARD_ROLES = [
  { value: 'board_president', label: 'President' },
  { value: 'board_vp', label: 'Vice President' },
  { value: 'board_secretary', label: 'Secretary' },
  { value: 'board_treasurer', label: 'Treasurer' },
] as const

export default async function MembersPage() {
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(
      inArray(users.role, ['board_president', 'board_vp', 'board_secretary', 'board_treasurer'])
    )

  const roleLabel = (role: string) =>
    BOARD_ROLES.find((r) => r.value === role)?.label ?? role

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Board Members</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Assign roles by email. When that person signs in with Google, they get dashboard access automatically.
        </p>
      </div>

      {/* Current members */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BOARD_ROLES.map(({ value, label }) => {
          const member = members.find((m) => m.role === value)
          return (
            <Card key={value} className={!member ? 'border-dashed opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  {member && (
                    <Badge variant={member.emailVerified ? 'default' : 'secondary'}>
                      {member.emailVerified ? 'Active' : 'Pending login'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {member ? (
                  <div className="text-sm space-y-0.5">
                    <p className="font-medium">{member.name ?? '(name not set)'}</p>
                    <p className="text-muted-foreground">{member.email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Assign form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign a Role</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignRoleForm roles={BOARD_ROLES} />
        </CardContent>
      </Card>
    </div>
  )
}
