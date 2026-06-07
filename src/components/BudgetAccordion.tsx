'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type LineItem = {
  id: string
  description: string
  section: 'income' | 'expense' | 'reserves'
  budgetedAmount: string | null
  actualAmount: string | null
}

interface Props {
  fiscalYear: number
  totalBudget: string
  lineItems: LineItem[]
}

const fmt = (n: string | number | null) =>
  n != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n))
    : '—'

function AccordionSection({ title, items }: { title: string; items: LineItem[] }) {
  const [open, setOpen] = useState(false)
  const total = items.reduce((sum, i) => sum + Number(i.budgetedAmount ?? 0), 0)

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors text-left"
      >
        <span className="capitalize">{title}</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground font-mono text-xs">{fmt(total)}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-0.5">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No items</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex justify-between py-1.5 border-b last:border-b-0">
                <span className="text-sm text-muted-foreground">{item.description}</span>
                <span className="text-sm font-mono tabular-nums">{fmt(item.budgetedAmount)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function BudgetAccordion({ fiscalYear, totalBudget, lineItems }: Props) {
  const income = lineItems.filter((i) => i.section === 'income')
  const expense = lineItems.filter((i) => i.section === 'expense')
  const reserves = lineItems.filter((i) => i.section === 'reserves')
  const fy2 = String(fiscalYear + 1).slice(2)

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        FY {fiscalYear}/{fy2} &mdash; Total Budget: <span className="font-medium">{fmt(totalBudget)}</span>
      </p>
      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <AccordionSection title="Income" items={income} />
          <AccordionSection title="Expenses" items={expense} />
          <AccordionSection title="Reserves" items={reserves} />
        </CardContent>
      </Card>
    </div>
  )
}
