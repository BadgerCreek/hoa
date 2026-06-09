'use client'

import { useRef, useState } from 'react'
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
  payment: Omit<PaymentForm, 'amount'> & { amount: number; invoiceUrl?: string | null }
}
type Props = AddButtonProps | ActionsProps

export function PaymentsClient(props: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PaymentForm>(emptyForm)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null)
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
    setInvoiceFile(null)
    setInvoiceUrl(null)
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
    setInvoiceFile(null)
    setInvoiceUrl(props.payment.invoiceUrl ?? null)
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

    let uploadedUrl: string | null = invoiceUrl

    if (invoiceFile) {
      const fd = new FormData()
      fd.append('file', invoiceFile)
      const upResp = await fetch('/api/payments/invoice', { method: 'POST', body: fd })
      if (!upResp.ok) {
        setError('Invoice upload failed')
        setSaving(false)
        return
      }
      const { url } = await upResp.json()
      uploadedUrl = url
    }

    const isEdit = props.mode === 'actions'
    const body = { ...form, amount, ...(uploadedUrl ? { invoiceUrl: uploadedUrl } : {}) }
    const resp = isEdit
      ? await fetch(`/api/payments/${props.paymentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
        <PaymentFormDialog
          open={open} onOpenChange={setOpen}
          form={form} field={field}
          invoiceFile={invoiceFile} invoiceUrl={invoiceUrl}
          onFileChange={f => setInvoiceFile(f)}
          onClearInvoice={() => { setInvoiceFile(null); setInvoiceUrl(null) }}
          fileRef={fileRef}
          saving={saving} error={error} onSave={saveRequest} title="Request Payment"
        />
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

      <PaymentFormDialog
        open={open} onOpenChange={setOpen}
        form={form} field={field}
        invoiceFile={invoiceFile} invoiceUrl={invoiceUrl}
        onFileChange={f => setInvoiceFile(f)}
        onClearInvoice={() => { setInvoiceFile(null); setInvoiceUrl(null) }}
        fileRef={fileRef}
        saving={saving} error={error} onSave={saveRequest} title="Edit Payment"
      />

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

function PaymentFormDialog({ open, onOpenChange, form, field, invoiceFile, invoiceUrl, onFileChange, onClearInvoice, fileRef, saving, error, onSave, title }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  form: PaymentForm
  field: (k: keyof PaymentForm, v: string) => void
  invoiceFile: File | null
  invoiceUrl: string | null
  onFileChange: (f: File | null) => void
  onClearInvoice: () => void
  fileRef: React.RefObject<HTMLInputElement | null>
  saving: boolean
  error: string
  onSave: () => void
  title: string
}) {
  const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)

  const previewSrc = invoiceFile
    ? URL.createObjectURL(invoiceFile)
    : invoiceUrl ?? null

  const previewIsImage = invoiceFile
    ? invoiceFile.type.startsWith('image/')
    : (invoiceUrl ? isImage(invoiceUrl) : false)

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

          <div className="space-y-1.5">
            <Label>Invoice</Label>
            {previewSrc ? (
              <div className="flex items-center gap-3">
                {previewIsImage ? (
                  <a href={previewSrc} target="_blank" rel="noopener noreferrer">
                    <img src={previewSrc} alt="Invoice preview" className="h-16 w-16 object-cover rounded border" />
                  </a>
                ) : (
                  <a href={previewSrc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    <PdfIcon />
                    {invoiceFile ? invoiceFile.name : 'View invoice'}
                  </a>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={onClearInvoice} className="text-muted-foreground">Remove</Button>
              </div>
            ) : (
              <>
                <Input
                  ref={fileRef as React.RefObject<HTMLInputElement>}
                  type="file"
                  accept="image/*,.pdf"
                  className="cursor-pointer"
                  onChange={e => onFileChange(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">Images or PDF</p>
              </>
            )}
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

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
