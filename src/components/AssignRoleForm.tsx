'use client'

import { useActionState } from 'react'
import { assignRole } from '@/app/(board)/members/actions'
import { Button } from '@/components/ui/button'

type Role = { value: string; label: string }

export function AssignRoleForm({ roles }: { roles: readonly Role[] }) {
  const [error, action, pending] = useActionState(
    async (_: string | null, formData: FormData) => {
      try {
        await assignRole(formData)
        return null
      } catch (e) {
        return (e as Error).message
      }
    },
    null
  )

  return (
    <form action={action} className="space-y-4 max-w-sm">
      <div className="space-y-1">
        <label className="text-sm font-medium">Role</label>
        <select
          name="role"
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a role...</option>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Full Name</label>
        <input
          name="name"
          type="text"
          required
          placeholder="Jane Smith"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Email Address</label>
        <input
          name="email"
          type="email"
          required
          placeholder="jane@example.com"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          Term Expires{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          name="termEnd"
          type="date"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving...' : 'Assign Role'}
      </Button>
    </form>
  )
}
