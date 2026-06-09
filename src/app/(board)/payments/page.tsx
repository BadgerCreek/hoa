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

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)
}

function InvoiceThumbnail({ url }: { url: string }) {
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <img
          src={url}
          alt="Invoice"
          className="h-14 w-14 object-cover rounded border hover:opacity-80 transition-opacity"
        />
      </a>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 flex flex-col items-center justify-center h-14 w-14 rounded border bg-muted hover:bg-muted/70 transition-colors gap-0.5"
      title="View invoice"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
      <span className="text-[10px] text-muted-foreground font-medium">PDF</span>
    </a>
  )
}

export default async function PaymentsPage() {
  const session = await auth()
  const userRole = session?.user?.role ?? ''
  const userIsAdmin = session?.user?.isAdmin ?? false
  const isTreasurer = userRole === 'board_president' || checkAdmin(userRole, userIsAdmin)
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
            <p className="text-sm text-amber-500 mt-1">{pendingCount} pending president approval</p>
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
                <div className="flex items-start gap-3 shrink-0">
                  {p.invoiceUrl && <InvoiceThumbnail url={p.invoiceUrl} />}
                  <p className="text-lg font-semibold">{fmt(p.amount)}</p>
                </div>
              </div>
              {p.status === 'pending' && (
                <PaymentsClient
                  isTreasurer={isTreasurer}
                  isAdmin={isAdmin}
                  mode="actions"
                  paymentId={p.id}
                  payment={{
                    title: p.title,
                    description: p.description ?? '',
                    amount: Number(p.amount),
                    vendor: p.vendor ?? '',
                    category: (p.category ?? 'other') as never,
                    invoiceUrl: p.invoiceUrl,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
