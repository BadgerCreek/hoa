'use client'

import { useState, useRef } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'

type Section = 'income' | 'expense' | 'reserves'

interface BudgetLine {
  id: string
  fiscalYear: number
  section: Section
  description: string
  budgetedAmount: string | null
  actualAmount: string | null
  proposedAmount: string | null
  comment: string | null
  sortOrder: number | null
}

interface Transaction {
  id: string
  date: string
  description: string
  type: string
  amount: string
  agentId: string | null
}

function n(v: string | null | undefined): number {
  return parseFloat(v ?? '0') || 0
}

function fmt(v: number): string {
  if (v === 0) return '—'
  const abs = Math.abs(v)
  const str = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(abs)
  return v < 0 ? `(${str})` : str
}

function diffClass(diff: number, section: Section): string {
  if (diff === 0) return 'text-muted-foreground'
  if (section === 'income') return diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  if (section === 'expense') return diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  return diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
}

function fyLabel(year: number) {
  return `FY ${String(year).slice(2)}/${String(year + 1).slice(2)}`
}

// ─── Editable Cell ────────────────────────────────────────────────────────────

function EditableCell({
  value, onSave, align = 'right', className = '', placeholder = '—', monospace = false, editable = true,
}: {
  value: string | null
  onSave: (v: string) => void
  align?: 'left' | 'right'
  className?: string
  placeholder?: string
  monospace?: boolean
  editable?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function start() {
    if (!editable) return
    setRaw(value ?? '')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit() {
    setEditing(false)
    if (raw !== (value ?? '')) onSave(raw)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`w-full bg-background border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${align === 'right' ? 'text-right' : 'text-left'} ${monospace ? 'font-mono' : ''}`}
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setRaw(value ?? ''); setEditing(false) }
        }}
      />
    )
  }

  return (
    <span
      onClick={start}
      className={`${editable ? 'cursor-text hover:bg-muted/60' : 'cursor-default'} select-none px-1 rounded transition-colors text-sm ${align === 'right' ? 'text-right block' : ''} ${monospace ? 'font-mono tabular-nums' : ''} ${className}`}
    >
      {value || placeholder}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BudgetView({
  initialLines,
  transactions,
  fiscalYear,
  isAdmin,
  canApprove,
}: {
  initialLines: BudgetLine[]
  transactions: Transaction[]
  fiscalYear: number
  isAdmin: boolean
  canApprove: boolean
}) {
  const [lines, setLines] = useState<BudgetLine[]>(initialLines)
  const [seeding, setSeeding] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approveResult, setApproveResult] = useState<string | null>(null)

  // ─── Data helpers ─────────────────────────────────────────────────────

  function bySection(s: Section) {
    return lines.filter(l => l.section === s).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }

  function totalBudgeted(s: Section) { return bySection(s).reduce((sum, l) => sum + n(l.budgetedAmount), 0) }
  function totalActual(s: Section) { return bySection(s).reduce((sum, l) => sum + n(l.actualAmount), 0) }
  function totalProposed(s: Section) { return bySection(s).reduce((sum, l) => sum + n(l.proposedAmount), 0) }

  const surplusBudget = totalBudgeted('income') - totalBudgeted('expense')
  const surplusActual = totalActual('income') - totalActual('expense')
  const surplusProposed = totalProposed('income') - totalProposed('expense')

  // ─── CRUD ─────────────────────────────────────────────────────────────

  async function updateLine(id: string, field: keyof BudgetLine, value: string) {
    setLines(ls => ls.map(l => l.id === id ? { ...l, [field]: value || null } : l))
    await fetch(`/api/budget-lines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value || null }),
    })
  }

  async function addRow(section: Section) {
    const sectionLines = bySection(section)
    const sortOrder = (sectionLines[sectionLines.length - 1]?.sortOrder ?? 0) + 1
    const resp = await fetch('/api/budget-lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fiscalYear, section, description: 'New line item', sortOrder }),
    })
    const { line } = await resp.json()
    setLines(ls => [...ls, line])
  }

  async function deleteLine(id: string) {
    setLines(ls => ls.filter(l => l.id !== id))
    await fetch(`/api/budget-lines/${id}`, { method: 'DELETE' })
  }

  async function seed() {
    setSeeding(true)
    await fetch('/api/budget-lines/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: fiscalYear }),
    })
    const resp = await fetch(`/api/budget-lines?year=${fiscalYear}`)
    setLines(await resp.json())
    setSeeding(false)
  }

  async function approveBudget() {
    setApproving(true)
    const resp = await fetch('/api/budget-lines/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromYear: fiscalYear, toYear: fiscalYear + 1 }),
    })
    const data = await resp.json()
    setApproving(false)
    if (resp.ok) {
      setApproveResult(`FY ${fyLabel(fiscalYear + 1)} budget approved — ${data.linesCreated} line items created.`)
    } else {
      setApproveResult(`Error: ${data.error ?? 'Something went wrong'}`)
    }
  }

  // ─── Section renderer ─────────────────────────────────────────────────

  function ActualSection({ section, label }: { section: Section; label: string }) {
    const rows = bySection(section)
    return (
      <tbody>
        <tr>
          <td colSpan={5} className="pt-5 pb-1 px-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
          </td>
        </tr>
        {rows.map(line => {
          const diff = section === 'income'
            ? n(line.actualAmount) - n(line.budgetedAmount)
            : n(line.budgetedAmount) - n(line.actualAmount)
          return (
            <tr key={line.id} className="group hover:bg-muted/30 transition-colors">
              <td className="px-4 py-1.5 w-[40%]">
                <EditableCell value={line.description} onSave={v => updateLine(line.id, 'description', v)} align="left" editable={isAdmin} />
              </td>
              <td className="px-3 py-1.5 text-right">
                <EditableCell value={line.budgetedAmount} onSave={v => updateLine(line.id, 'budgetedAmount', v)} monospace editable={isAdmin} />
              </td>
              <td className="px-3 py-1.5 text-right">
                <EditableCell value={line.actualAmount} onSave={v => updateLine(line.id, 'actualAmount', v)} monospace editable={isAdmin} />
              </td>
              <td className={`px-3 py-1.5 text-right font-mono tabular-nums text-sm ${diffClass(diff, section)}`}>
                {fmt(diff)}
              </td>
              <td className="w-8 px-2">
                {isAdmin && <button onClick={() => deleteLine(line.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all text-xs">✕</button>}
              </td>
            </tr>
          )
        })}
        {isAdmin && (
          <tr>
            <td className="px-4 py-1">
              <button onClick={() => addRow(section)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">+ Add row</button>
            </td>
          </tr>
        )}
      </tbody>
    )
  }

  function ProposedSection({ section, label }: { section: Section; label: string }) {
    const rows = bySection(section)
    return (
      <tbody>
        <tr>
          <td colSpan={6} className="pt-5 pb-1 px-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
          </td>
        </tr>
        {rows.map(line => {
          const change = n(line.proposedAmount) - n(line.budgetedAmount)
          return (
            <tr key={line.id} className="group hover:bg-muted/30 transition-colors">
              <td className="px-4 py-1.5 w-[30%]">
                <EditableCell value={line.description} onSave={v => updateLine(line.id, 'description', v)} align="left" editable={isAdmin} />
              </td>
              <td className="px-3 py-1.5 text-right">
                <span className="font-mono tabular-nums text-sm text-muted-foreground">{fmt(n(line.budgetedAmount))}</span>
              </td>
              <td className="px-3 py-1.5 text-right">
                <EditableCell value={line.proposedAmount} onSave={v => updateLine(line.id, 'proposedAmount', v)} monospace editable={isAdmin} />
              </td>
              <td className={`px-3 py-1.5 text-right font-mono tabular-nums text-sm ${diffClass(change, section)}`}>
                {change === 0 ? '—' : fmt(change)}
              </td>
              <td className="px-3 py-1.5">
                <EditableCell value={line.comment} onSave={v => updateLine(line.id, 'comment', v)} align="left" placeholder="Add note…" className="text-muted-foreground italic" editable={isAdmin} />
              </td>
              <td className="w-8 px-2">
                {isAdmin && <button onClick={() => deleteLine(line.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all text-xs">✕</button>}
              </td>
            </tr>
          )
        })}
        {isAdmin && (
          <tr>
            <td className="px-4 py-1">
              <button onClick={() => addRow(section)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">+ Add row</button>
            </td>
          </tr>
        )}
      </tbody>
    )
  }

  // ─── Empty state ──────────────────────────────────────────────────────

  if (lines.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">No budget data for {fyLabel(fiscalYear)}.</p>
        {isAdmin && (
          <Button variant="outline" onClick={seed} disabled={seeding}>
            {seeding ? 'Loading…' : `Load FY 25/26 sample data`}
          </Button>
        )}
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
    <Dialog open={approveOpen} onOpenChange={open => { setApproveOpen(open); if (!open) setApproveResult(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve {fyLabel(fiscalYear + 1)} Budget</DialogTitle>
          <DialogDescription>
            This will create the {fyLabel(fiscalYear + 1)} budget using the proposed amounts below.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {!approveResult ? (
          <div className="space-y-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Income</span>
              <span className="font-mono font-semibold">{fmt(totalProposed('income'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Expenses</span>
              <span className="font-mono font-semibold">{fmt(totalProposed('expense'))}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Surplus / (Deficit)</span>
              <span className={`font-mono font-bold ${surplusProposed >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {fmt(surplusProposed)}
              </span>
            </div>
          </div>
        ) : (
          <p className="py-2 text-sm">{approveResult}</p>
        )}
        <DialogFooter>
          {!approveResult ? (
            <>
              <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
              <Button onClick={approveBudget} disabled={approving}>
                {approving ? 'Approving…' : `Approve ${fyLabel(fiscalYear + 1)} Budget`}
              </Button>
            </>
          ) : (
            <Button onClick={() => { setApproveOpen(false); setApproveResult(null) }}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Tabs defaultValue="actual" className="space-y-6">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="actual">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="proposed">Proposed {fyLabel(fiscalYear + 1)}</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={seed} disabled={seeding} className="text-xs text-muted-foreground">
            {seeding ? 'Loading…' : 'Reload sample data'}
          </Button>
        )}
      </div>

      {/* ── Budget vs Actual ── */}
      <TabsContent value="actual" className="mt-0">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 text-sm font-semibold">{fyLabel(fiscalYear)}</th>
                <th className="text-right px-3 py-3 text-sm font-semibold w-32">Budget</th>
                <th className="text-right px-3 py-3 text-sm font-semibold w-32">Actual</th>
                <th className="text-right px-3 py-3 text-sm font-semibold w-32">Difference</th>
                <th className="w-8" />
              </tr>
            </thead>

            <ActualSection section="income" label="Income" />

            <tbody>
              <tr className="border-t border-b bg-muted/20">
                <td className="px-4 py-2 font-semibold text-sm">Total Income</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold">{fmt(totalBudgeted('income'))}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold">{fmt(totalActual('income'))}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold ${diffClass(totalActual('income') - totalBudgeted('income'), 'income')}`}>
                  {fmt(totalActual('income') - totalBudgeted('income'))}
                </td>
                <td />
              </tr>
            </tbody>

            <ActualSection section="expense" label="Expenses" />

            <tbody>
              <tr className="border-t border-b bg-muted/20">
                <td className="px-4 py-2 font-semibold text-sm">Total Expenses</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold">{fmt(totalBudgeted('expense'))}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold">{fmt(totalActual('expense'))}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold ${diffClass(totalBudgeted('expense') - totalActual('expense'), 'expense')}`}>
                  {fmt(totalBudgeted('expense') - totalActual('expense'))}
                </td>
                <td />
              </tr>
              <tr className="border-b-2 bg-muted/40">
                <td className="px-4 py-2.5 font-bold text-sm">Budgeted Surplus / (Deficit)</td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm font-bold ${surplusBudget >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{fmt(surplusBudget)}</td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm font-bold ${surplusActual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{fmt(surplusActual)}</td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm font-bold ${diffClass(surplusActual - surplusBudget, 'income')}`}>
                  {fmt(surplusActual - surplusBudget)}
                </td>
                <td />
              </tr>
            </tbody>

            <ActualSection section="reserves" label="Reserves" />

            <tbody>
              <tr className="border-t bg-muted/20">
                <td className="px-4 py-2.5 font-bold text-sm">Net Income</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-muted-foreground">—</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-muted-foreground">—</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-muted-foreground">—</td>
                <td />
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground px-4 py-2 border-t">Click any value to edit · FY: April 1 – March 31</p>
        </div>
      </TabsContent>

      {/* ── Proposed ── */}
      <TabsContent value="proposed" className="mt-0">
        {canApprove && (
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setApproveOpen(true)}>
              Approve {fyLabel(fiscalYear + 1)} Budget
            </Button>
          </div>
        )}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 text-sm font-semibold w-[30%]">Description</th>
                <th className="text-right px-3 py-3 text-sm font-semibold w-28 text-muted-foreground">{fyLabel(fiscalYear)} Budget</th>
                <th className="text-right px-3 py-3 text-sm font-semibold w-28">Proposed {fyLabel(fiscalYear + 1)}</th>
                <th className="text-right px-3 py-3 text-sm font-semibold w-24">Change</th>
                <th className="text-left px-3 py-3 text-sm font-semibold">Comments</th>
                <th className="w-8" />
              </tr>
            </thead>

            <ProposedSection section="income" label="Income" />

            <tbody>
              <tr className="border-t border-b bg-muted/20">
                <td className="px-4 py-2 font-semibold text-sm">Total Income</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-muted-foreground">{fmt(totalBudgeted('income'))}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold">{fmt(totalProposed('income'))}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold ${diffClass(totalProposed('income') - totalBudgeted('income'), 'income')}`}>
                  {totalProposed('income') - totalBudgeted('income') === 0 ? '—' : fmt(totalProposed('income') - totalBudgeted('income'))}
                </td>
                <td /><td />
              </tr>
            </tbody>

            <ProposedSection section="expense" label="Expenses" />

            <tbody>
              <tr className="border-t border-b bg-muted/20">
                <td className="px-4 py-2 font-semibold text-sm">Total Expenses</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-muted-foreground">{fmt(totalBudgeted('expense'))}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold">{fmt(totalProposed('expense'))}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums text-sm font-semibold ${diffClass(totalBudgeted('expense') - totalProposed('expense'), 'expense')}`}>
                  {totalProposed('expense') - totalBudgeted('expense') === 0 ? '—' : fmt(totalProposed('expense') - totalBudgeted('expense'))}
                </td>
                <td /><td />
              </tr>
              <tr className="border-b-2 bg-muted/40">
                <td className="px-4 py-2.5 font-bold text-sm">Budgeted Surplus / (Deficit)</td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm text-muted-foreground`}>{fmt(surplusBudget)}</td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm font-bold ${surplusProposed >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{fmt(surplusProposed)}</td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums text-sm font-semibold ${diffClass(surplusProposed - surplusBudget, 'income')}`}>
                  {surplusProposed - surplusBudget === 0 ? '—' : fmt(surplusProposed - surplusBudget)}
                </td>
                <td /><td />
              </tr>
            </tbody>

            <ProposedSection section="reserves" label="Reserves" />

            <tbody>
              <tr className="border-t bg-muted/20">
                <td className="px-4 py-2.5 font-bold text-sm">Net Income</td>
                <td colSpan={5} className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-muted-foreground">—</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground px-4 py-2 border-t">Click any blue value to edit · Comments auto-save on blur</p>
        </div>
      </TabsContent>

      {/* ── Transactions ── */}
      <TabsContent value="transactions" className="mt-0">
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions recorded yet.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-right px-4 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground">{tx.date}</td>
                    <td className="px-4 py-2.5">
                      {tx.description}
                      {tx.agentId && <span className="ml-2 text-xs text-muted-foreground">({tx.agentId})</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={tx.type === 'income' ? 'default' : 'secondary'}>{tx.type}</Badge>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono tabular-nums font-medium ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {tx.type === 'expense' ? '−' : '+'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
    </>
  )
}
