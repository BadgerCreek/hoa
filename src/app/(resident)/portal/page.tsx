import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { notifications, documents, budgets, budgetLineItems } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { SignOutButton } from '@/components/SignOutButton'
import { BudgetAccordion } from '@/components/BudgetAccordion'
import { ContactHOAButton } from '@/components/ContactHOAButton'
import { FileText, Bell } from 'lucide-react'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']

const CURRENT_FY = 2026

export default async function ResidentPortalPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user as { role?: string }).role
  const isBoardMember = role && BOARD_ROLES.includes(role)
  const userId = session.user?.id!

  const [userNotifications, allDocuments, budget] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(10),
    db.select().from(documents).orderBy(desc(documents.createdAt)).limit(10),
    db.select().from(budgets).where(eq(budgets.fiscalYear, CURRENT_FY)).limit(1),
  ])

  const currentBudget = budget[0] ?? null
  const lineItems = currentBudget
    ? await db.select().from(budgetLineItems).where(eq(budgetLineItems.fiscalYear, CURRENT_FY)).orderBy(budgetLineItems.sortOrder)
    : []

  const unreadCount = userNotifications.filter((n) => !n.read).length

  const categoryLabel: Record<string, string> = {
    minutes: 'Minutes',
    financial: 'Financial',
    legal: 'Legal',
    maintenance: 'Maintenance',
    other: 'Other',
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">Badger Creek Ranch HOA</h1>
          <p className="text-xs text-muted-foreground">Resident Portal</p>
        </div>
        <div className="flex items-center gap-4">
          {isBoardMember && (
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Board Portal →
            </Link>
          )}
          <span className="text-sm">{session.user?.name}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Welcome back, {session.user?.name?.split(' ')[0]}</h2>
            <p className="text-sm text-muted-foreground mt-1">Stay up to date with your HOA</p>
          </div>
          <ContactHOAButton />
        </div>

        {/* Notices */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-base font-semibold">Notices</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs h-5 px-1.5">{unreadCount}</Badge>
            )}
          </div>
          {userNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notices at this time.</p>
          ) : (
            <div className="space-y-2">
              {userNotifications.map((n) => (
                <Card key={n.id} className={n.read ? 'opacity-60' : ''}>
                  <CardContent className="py-3 px-4 flex items-start gap-3">
                    <Bell className={`h-4 w-4 mt-0.5 shrink-0 ${n.read ? 'text-muted-foreground' : 'text-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{n.message}</p>
                      {n.link && (
                        <Link href={n.link} className="text-xs text-primary hover:underline mt-0.5 block">
                          View details →
                        </Link>
                      )}
                    </div>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Budget */}
        <section>
          <h3 className="text-base font-semibold mb-3">Budget</h3>
          {currentBudget ? (
            <BudgetAccordion
              fiscalYear={currentBudget.fiscalYear}
              totalBudget={currentBudget.totalBudget}
              lineItems={lineItems.map((i) => ({
                id: i.id,
                description: i.description,
                section: i.section,
                budgetedAmount: i.budgetedAmount,
                actualAmount: i.actualAmount,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No budget information available.</p>
          )}
        </section>

        {/* Documents */}
        <section>
          <h3 className="text-base font-semibold mb-3">Documents</h3>
          {allDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents available.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                {allDocuments.map((doc, idx) => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${idx !== allDocuments.length - 1 ? 'border-b' : ''}`}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm truncate">{doc.title}</span>
                    {doc.category && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {categoryLabel[doc.category] ?? doc.category}
                      </Badge>
                    )}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Board Members */}
        <section>
          <h3 className="text-base font-semibold mb-3">Board Members</h3>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">Meet your Badger Creek Ranch HOA board.</p>
              <Link href="/board-members">
                <Button variant="outline" size="sm">View Board Members</Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
