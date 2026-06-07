import { db } from '@/db'
import { tasks, proposals, transactions, budgets, inquiries } from '@/db/schema'
import { eq, desc, count } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { InboxList } from '@/components/InboxList'

export default async function DashboardPage() {
  const year = new Date().getFullYear()

  const [
    awaitingTasks,
    openProposals,
    recentTransactions,
    budget,
    openInquiries,
  ] = await Promise.all([
    db.select({ count: count() }).from(tasks).where(eq(tasks.status, 'awaiting_human')),
    db.select({ count: count() }).from(proposals).where(eq(proposals.status, 'open')),
    db.select().from(transactions).orderBy(desc(transactions.date)).limit(5),
    db.query.budgets.findFirst({ where: eq(budgets.fiscalYear, year) }),
    db.query.inquiries.findMany({
      where: eq(inquiries.status, 'open'),
      orderBy: desc(inquiries.createdAt),
      with: { from: true },
      limit: 20,
    }),
  ])

  const pendingCount = awaitingTasks[0]?.count ?? 0
  const proposalCount = openProposals[0]?.count ?? 0
  const inboxCount = openInquiries.length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className={pendingCount > 0 ? 'border-amber-400' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Awaiting Review</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/tasks" className="text-sm text-blue-500 hover:underline">View tasks →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Proposals</CardDescription>
            <CardTitle className="text-3xl">{proposalCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/proposals" className="text-sm text-blue-500 hover:underline">View proposals →</Link>
          </CardContent>
        </Card>

        <Card className={inboxCount > 0 ? 'border-amber-400' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Inbox</CardDescription>
            <CardTitle className="text-3xl">{inboxCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm text-muted-foreground">Open inquiries</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{year} Budget</CardDescription>
            <CardTitle className="text-3xl">
              {budget ? `$${Number(budget.totalBudget).toLocaleString()}` : 'Not set'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budget && (
              <p className="text-sm text-muted-foreground">
                ${Number(budget.allocated).toLocaleString()} allocated
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inbox */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbox</CardTitle>
          <CardDescription>Dues and general inquiries from residents</CardDescription>
        </CardHeader>
        <CardContent>
          <InboxList initialInquiries={openInquiries.map((i) => ({
            id: i.id,
            category: i.category,
            message: i.message,
            createdAt: i.createdAt,
            from: i.from ? { name: i.from.name, email: i.from.email } : null,
          }))} />
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm">
                  <span>{tx.description}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={tx.type === 'income' ? 'default' : 'secondary'}>
                      {tx.type}
                    </Badge>
                    <span className={tx.type === 'income' ? 'text-green-600' : 'text-red-500'}>
                      {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links to agents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Agents</CardTitle>
          <CardDescription>Consult your board AI agents</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          {['treasurer', 'president', 'secretary', 'vp'].map((role) => (
            <Link key={role} href={`/agents?role=${role}`}>
              <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-muted capitalize">
                {role === 'vp' ? 'Vice President' : role}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
