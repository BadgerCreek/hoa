import { db } from '@/db'
import { users, boardMembers } from '@/db/schema'
import { eq, inArray, or } from 'drizzle-orm'
import { auth, isAdmin as checkAdmin } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AssignRoleForm } from '@/components/AssignRoleForm'
import { ArcToggleButton } from '@/components/ArcToggleButton'

const BOARD_ROLES = [
  { value: 'board_member', label: 'Board Member' },
  { value: 'board_president', label: 'President' },
  { value: 'board_vp', label: 'Vice President' },
  { value: 'board_secretary', label: 'Secretary' },
  { value: 'board_treasurer', label: 'Treasurer' },
] as const

const ALL_ROLE_VALUES = [...BOARD_ROLES.map(r => r.value), 'board_arc'] as string[]

export default async function MembersPage() {
  const session = await auth()
  const isAdmin = checkAdmin(session?.user?.role, session?.user?.isAdmin)

  const [members, termRecords, arcMembers] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, emailVerified: users.emailVerified, isArcMember: users.isArcMember })
      .from(users)
      .where(inArray(users.role, ALL_ROLE_VALUES as any)),
    db.select({ userId: boardMembers.userId, termEnd: boardMembers.termEnd })
      .from(boardMembers)
      .where(eq(boardMembers.active, true)),
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, emailVerified: users.emailVerified, isArcMember: users.isArcMember })
      .from(users)
      .where(eq(users.isArcMember, true)),
  ])

  const termByUserId = Object.fromEntries(termRecords.map(t => [t.userId, t.termEnd]))

  // Merge: ARC section = isArcMember=true users + board_arc role users (legacy)
  const arcMemberIds = new Set(arcMembers.map(m => m.id))
  const arcLegacy = members.filter(m => m.role === 'board_arc' && !arcMemberIds.has(m.id))
  const allArcMembers = [...arcMembers, ...arcLegacy]

  // Board members shown in role grid (exclude board_arc legacy-role-only users from main grid)
  const boardRoleValues = BOARD_ROLES.map(r => r.value) as string[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Board Members</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Assign roles by email. When that person signs in with Google, they get dashboard access automatically.
        </p>
      </div>

      {/* Officer / member role grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BOARD_ROLES.map(({ value, label }) => {
          const member = members.find((m) => m.role === value)
          const termEnd = member ? termByUserId[member.id] : null
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
                    {termEnd && (
                      <p className="text-xs text-muted-foreground">
                        Term expires: {new Date(termEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ARC Committee */}
      <div>
        <h2 className="text-lg font-semibold mb-3">ARC Committee</h2>
        <p className="text-sm text-muted-foreground mb-4">
          ARC members can hold any board role simultaneously. Toggle membership below or assign the ARC-only role.
        </p>
        {allArcMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ARC committee members assigned.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allArcMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm space-y-0.5">
                      <p className="font-medium">{member.name ?? '(name not set)'}</p>
                      <p className="text-muted-foreground">{member.email}</p>
                      {member.role && boardRoleValues.includes(member.role) && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {BOARD_ROLES.find(r => r.value === member.role)?.label}
                        </Badge>
                      )}
                    </div>
                    {isAdmin && (
                      <ArcToggleButton userId={member.id} isArcMember={member.isArcMember ?? true} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Assign form */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign a Role</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignRoleForm roles={BOARD_ROLES} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
