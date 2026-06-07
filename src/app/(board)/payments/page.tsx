import { db } from '@/db'
import { payments } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { auth, isAdmin as checkAdmin } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { PaymentsClient } from '@/components/PaymentsClient'

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  approved: 'default',
  rejected: 'destructive',
}

function fmt(val: string | null) {
  if (!val) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val))
}

export default async function PaymentsPage() {
  const session = await auth()
  const userRole = session?.user?.role ?? ''
  const userIsAdmin = session?.user?.isAdmin ?? false
  const isTreasurer = userRole === 'board_treasurer' || checkAdmin(userRole, userIsAdmin)
  const isAdmin = checkAdmin(userRole, userIsAdmin)

  const allPayments = await db.query.payments.findMany({
    orderBy: desc(payments.createdAt),
    with: { requester: true, approver: true },
    limit: 50,
  })

  const pendingCount = allPayments.filter(p => p.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-500 mt-1">{pendingCount} pending treasurer approval</p>
          )}
        </div>
        <PaymentsClient isTreasurer={isTreasurer} mode="add-button" />
      </div>

      {allPayments.length === 0 ? (
        <p className="text-muted-foreground">No payments yet. Use the button above to request one.</p>
      ) : (
        <div className="space-y-3">
          {allPayments.map(p => (
            <div
              key={p.id}
              className={`rounded-lg border p-4 space-y-2 ${p.status === 'pending' ? 'border-amber-400/60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.title}</span>
                    {p.vendor && <span className="text-sm text-muted-foreground">· {p.vendor}</span>}
                    <Badge variant={statusColor[p.status ?? 'pending']}>{p.status}</Badge>
                    <Badge variant="outline" className="text-xs">{p.category}</Badge>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Requested by {p.requester?.name ?? p.requester?.email}
                    {p.approver && ` · ${p.status === 'approved' ? 'Approved' : 'Rejected'} by ${p.approver.name ?? p.approver.email}`}
                    {p.rejectionReason && ` · "${p.rejectionReason}"`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-semibold">{fmt(p.amount)}</p>
                </div>
              </div>
              {p.status === 'pending' && (
                <PaymentsClient
                  isTreasurer={isTreasurer}
                  isAdmin={isAdmin}
                  mode="actions"
                  paymentId={p.id}
                  payment={{ title: p.title, description: p.description ?? '', amount: Number(p.amount), vendor: p.vendor ?? '', category: (p.category ?? 'other') as never }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
