'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { PermissionKey, PermissionsMap, PermissionThreshold } from '@/lib/permissions'

const ROLE_MAP: { role: string; board: boolean; admin: boolean }[] = [
  { role: 'Resident',  board: false, admin: false },
  { role: 'President', board: true,  admin: true  },
  { role: 'VP',        board: true,  admin: true  },
  { role: 'Secretary', board: true,  admin: true  },
  { role: 'Treasurer', board: true,  admin: true  },
  { role: 'Admin',     board: true,  admin: true  },
]

interface Props {
  permissions: PermissionsMap
  actions: PermissionKey[]
  labels: Record<PermissionKey, string>
}

export function PermissionsSettings({ permissions, actions, labels }: Props) {
  const [current, setCurrent] = useState(permissions)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(action: PermissionKey, value: PermissionThreshold) {
    const prev = current
    const next = { ...current, [action]: value }
    setCurrent(next)
    setSaving(action)
    setError(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error('Save failed')
    } catch {
      setError(`Failed to save "${labels[action]}"`)
      setCurrent(prev)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Configurable permissions */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Action permissions</h2>
        <p className="text-sm text-muted-foreground">
          Toggle each action between board-member access and admin-only access. Changes auto-save.
        </p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead className="w-44">Required role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((action) => (
                <TableRow key={action}>
                  <TableCell>
                    <span className="font-medium text-sm">{labels[action]}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{action}</span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={current[action]}
                      onValueChange={(v) => handleChange(action, v as PermissionThreshold)}
                      disabled={saving === action}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="board">Board members</SelectItem>
                        <SelectItem value="admin">Admin only</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Read-only permissions map */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Role capability map</h2>
        <p className="text-sm text-muted-foreground">
          What each role can do based on current permission settings above.
        </p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                {ROLE_MAP.map(r => (
                  <TableHead key={r.role} className="text-center w-24">{r.role}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((action) => {
                const threshold = current[action]
                return (
                  <TableRow key={action}>
                    <TableCell className="text-sm">{labels[action]}</TableCell>
                    {ROLE_MAP.map(r => {
                      const canDo = threshold === 'board' ? r.board : r.admin
                      return (
                        <TableCell key={r.role} className="text-center">
                          {canDo
                            ? <span className="text-emerald-600 dark:text-emerald-400 text-base">✓</span>
                            : <span className="text-muted-foreground text-xs">—</span>
                          }
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          <Badge variant="outline" className="mr-1 text-xs">Admin Access</Badge>
          Board officers with the Admin Access toggle also pass admin-only checks.
        </p>
      </div>
    </div>
  )
}
