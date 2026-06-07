'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Category = 'maintenance' | 'utilities' | 'administrative' | 'landscaping' | 'insurance' | 'other'

interface PaymentForm {
  title: string
  description: string
  amount: string
  vendor: string
  category: Category
}

const emptyForm: PaymentForm = { title: '', description: '', amount: '', vendor: '', category: 'other' }

const categories: Category[] = ['maintenance', 'utilities', 'administrative', 'landscaping', 'insurance', 'other']

interface AddButtonProps {
  isTreasurer: boolean
  mode: 'add-button'
}
interface ActionsProps {
  isTreasurer: boolean
  isAdmin: boolean
  mode: 'actions'
  paymentId: string
  payment: Omit<PaymentForm, 'amount'> & { amount: number }
}
type Props = AddButtonProps | ActionsProps

export function PaymentsClient(props: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PaymentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [acting, setActing] = useState(false)

  function field(k: keyof PaymentForm, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function openRequest() {
    setForm(emptyForm)
    setError('')
    setOpen(true)
  }

  function openEdit() {
    if (props.mode !== 'actions') return
    setForm({
      title: props.payment.title,
      description: props.payment.description,
      amount: props.payment.amount.toString(),
      vendor: props.payment.vendor,
      category: props.payment.category,
    })
    setError('')
    setOpen(true)
  }

  async function saveRequest() {
    if (!form.title.trim() || !form.amount) {
      setError('Title and amount are required')
      return
    }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount')
      return
    }
    setSaving(true)
    setError('')

    const isEdit = props.mode === 'actions'
    const resp = isEdit
      ? await fetch(`/api/payments/${props.paymentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, amount }),
        })
      : await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, amount }),
        })

    setSaving(false)
    if (!resp.ok) { setError(await resp.text()); return }
    setOpen(false)
    router.refresh()
  }

  async function approve() {
    if (props.mode !== 'actions') return
    setActing(true)
    await fetch(`/api/payments/${props.paymentId}/approve`, { method: 'POST' })
    setActing(false)
    router.refresh()
  }

  async function reject() {
    if (props.mode !== 'actions') return
    setActing(true)
    await fetch(`/api/payments/${props.paymentId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    setActing(false)
    setRejectOpen(false)
    setReason('')
    router.refresh()
  }

  if (props.mode === 'add-button') {
    return (
      <>
        <Button size="sm" onClick={openRequest}>Request Payment</Button>
        <PaymentFormDialog open={open} onOpenChange={setOpen} form={form} field={field} saving={saving} error={error} onSave={saveRequest} title="Request Payment" />
      </>
    )
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {props.isAdmin && <Button size="sm" variant="ghost" onClick={openEdit} disabled={acting}>Edit</Button>}
        {props.isTreasurer && (
          <>
            <Button size="sm" onClick={approve} disabled={acting}>Approve</Button>
            <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)} disabled={acting}>Reject</Button>
          </>
        )}
      </div>

      <PaymentFormDialog open={open} onOpenChange={setOpen} form={form} field={field} saving={saving} error={error} onSave={saveRequest} title="Edit Payment" />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Reason (optional)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this being rejected?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={acting}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={acting}>{acting ? 'Rejecting…' : 'Reject'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PaymentFormDialog({ open, onOpenChange, form, field, saving, error, onSave, title }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  form: PaymentForm
  field: (k: keyof PaymentForm, v: string) => void
  saving: boolean
  error: string
  onSave: () => void
  title: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => field('title', e.target.value)} placeholder="Snow plowing — XYZ Company" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => field('amount', e.target.value)} placeholder="500.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Input value={form.vendor} onChange={e => field('vendor', e.target.value)} placeholder="Company name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => field('category', v as never)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['maintenance', 'utilities', 'administrative', 'landscaping', 'insurance', 'other'] as const).map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => field('description', e.target.value)} placeholder="Additional details…" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
