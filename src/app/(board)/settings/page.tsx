import { auth, isAdmin as checkAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getPermissions,
  PERMISSION_LABELS,
  PERMISSION_DEFAULTS,
} from '@/lib/permissions'
import type { PermissionKey } from '@/lib/permissions'
import { PermissionsSettings } from '@/components/PermissionsSettings'

export default async function SettingsPage() {
  const session = await auth()
  if (!checkAdmin(session?.user?.role, session?.user?.isAdmin)) redirect('/dashboard')

  const perms = await getPermissions()
  const actions = Object.keys(PERMISSION_DEFAULTS) as PermissionKey[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which roles can perform each action. Changes take effect within 60 seconds.
        </p>
      </div>
      <PermissionsSettings
        permissions={perms}
        actions={actions}
        labels={PERMISSION_LABELS}
      />
    </div>
  )
}
