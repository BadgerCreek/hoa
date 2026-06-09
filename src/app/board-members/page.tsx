import { db } from '@/db'
import { users, boardMembers } from '@/db/schema'
import { inArray, eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  board_president: 'President',
  board_vp: 'Vice President',
  board_secretary: 'Secretary',
  board_treasurer: 'Treasurer',
  board_member: 'Board Member',
  board_arc: 'ARC Committee',
}

const ROLE_ORDER = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'board_member', 'board_arc']

export default async function BoardMembersPage() {
  const [members, termRecords] = await Promise.all([
    db
      .select({ name: users.name, email: users.email, role: users.role, id: users.id })
      .from(users)
      .where(inArray(users.role, ROLE_ORDER as any)),
    db.select({ userId: boardMembers.userId, termEnd: boardMembers.termEnd })
      .from(boardMembers)
      .where(eq(boardMembers.active, true)),
  ])

  const termByUserId = Object.fromEntries(termRecords.map(t => [t.userId, t.termEnd]))

  const OFFICER_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer']
  const officers = OFFICER_ROLES.map((role) => ({ role, member: members.find((m) => m.role === role) }))
  const atLargeMembers = members.filter((m) => m.role === 'board_member' || m.role === 'board_arc')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">Badger Creek Ranch HOA</h1>
          <p className="text-xs text-muted-foreground">Board Members</p>
        </div>
        <Link href="/portal" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Portal
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <h2 className="text-xl font-bold">Your HOA Board</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {officers.map(({ role, member }) => (
            <Card key={role}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {ROLE_LABELS[role]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {member ? (
                  <div>
                    <p className="font-medium">{member.name ?? 'TBD'}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    {termByUserId[member.id] && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Term expires: {new Date(termByUserId[member.id]!).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Vacant</p>
                )}
              </CardContent>
            </Card>
          ))}
          {atLargeMembers.map((member) => (
            <Card key={member.email}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {ROLE_LABELS[member.role ?? ''] ?? 'Board Member'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{member.name ?? 'TBD'}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
                {termByUserId[member.id] && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Term expires: {new Date(termByUserId[member.id]!).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
