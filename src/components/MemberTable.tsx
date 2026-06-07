'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Role = 'resident' | 'board_president' | 'board_vp' | 'board_secretary' | 'board_treasurer' | 'admin'

interface Member {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string | null
  lotNumber: string | null
  address: string | null
}

const roleLabel: Record<string, string> = {
  resident: 'Resident',
  board_president: 'President',
  board_vp: 'Vice President',
  board_secretary: 'Secretary',
  board_treasurer: 'Treasurer',
  admin: 'Admin',
}

const duesColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  pending: 'secondary',
  late: 'destructive',
  waived: 'outline',
}

interface DuesInfo {
  memberId: string
  status: string | null
}

interface FormState {
  name: string; email: string; phone: string; role: Role
  lotNumber: string; address: string; duesStatus: string
}
const empty: FormState = { name: '', email: '', phone: '', role: 'resident', lotNumber: '', address: '', duesStatus: '' }

export function MemberTable({ members, duesByMember }: { members: Member[]; duesByMember: Record<string, string | null> }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openAdd() {
    setEditing(null)
    setForm(empty)
    setError('')
    setOpen(true)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setForm({
      name: m.name ?? '',
      email: m.email,
      phone: m.phone ?? '',
      role: (m.role ?? 'resident') as Role,
      lotNumber: m.lotNumber ?? '',
      address: m.address ?? '',
      duesStatus: (duesByMember[m.id] ?? '') as string,
    })
    setError('')
    setOpen(true)
  }

  function field(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required')
      return
    }
    setSaving(true)
    setError('')

    const body = {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      role: form.role,
      lotNumber: form.lotNumber || undefined,
      address: form.address || undefined,
      duesStatus: form.duesStatus || undefined,
    }

    const resp = editing
      ? await fetch(`/api/members/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    setSaving(false)
    if (!resp.ok) {
      const text = await resp.text()
      setError(text || 'Failed to save')
      return
    }
    setOpen(false)
    router.refresh()
  }

  async function deleteMember() {
    if (!confirmDelete) return
    setDeleting(true)
    await fetch(`/api/members/${confirmDelete.id}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmDelete(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{members.length} members</p>
        <Button size="sm" onClick={openAdd}>Add Member</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Lot / Address</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Dues</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map(m => {
              const duesStatus = duesByMember[m.id]
              return (
                <tr key={m.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{m.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{m.email}</div>
                    {m.phone && <div className="text-xs">{m.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {m.lotNumber && (
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-2">
                        Lot {m.lotNumber}
                      </span>
                    )}
                    {m.address && <span className="text-muted-foreground">{m.address}</span>}
                    {!m.lotNumber && !m.address && <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {roleLabel[m.role ?? 'resident'] ?? m.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {duesStatus ? (
                      <Badge variant={duesColor[duesStatus as string] ?? 'secondary'}>{duesStatus}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(m)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Member' : 'Add Member'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => field('name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => field('email', e.target.value)} placeholder="email@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => field('phone', e.target.value)} placeholder="(555) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => field('role', v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabel).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lot Number</Label>
                <Input value={form.lotNumber} onChange={e => field('lotNumber', e.target.value)} placeholder="42" />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => field('address', e.target.value)} placeholder="123 Ranch Rd" />
              </div>
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label>Dues Status</Label>
                <Select value={form.duesStatus} onValueChange={v => field('duesStatus', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="No change" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Not Paid (Pending)</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <strong>{confirmDelete?.name ?? confirmDelete?.email}</strong> from the directory? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={deleteMember} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
