import { db } from '@/db'
import { users } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  board_president: 'President',
  board_vp: 'Vice President',
  board_secretary: 'Secretary',
  board_treasurer: 'Treasurer',
}

const ROLE_ORDER = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer']

export default async function BoardMembersPage() {
  const members = await db
    .select({ name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(inArray(users.role, ROLE_ORDER as any))

  const sorted = ROLE_ORDER
    .map((role) => ({ role, member: members.find((m) => m.role === role) }))

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
          {sorted.map(({ role, member }) => (
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
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Vacant</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
