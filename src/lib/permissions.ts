import { db } from '@/db'
import { settings } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type PermissionKey =
  | 'proposals.edit'
  | 'proposals.delete'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'payments.edit'
  | 'budget.manage'
  | 'members.manage'
  | 'documents.manage'
  | 'roles.assign'

export type PermissionThreshold = 'board' | 'admin'
export type PermissionsMap = Record<PermissionKey, PermissionThreshold>

export const PERMISSION_DEFAULTS: PermissionsMap = {
  'proposals.edit':   'admin',
  'proposals.delete': 'admin',
  'tasks.edit':       'admin',
  'tasks.delete':     'admin',
  'payments.edit':    'admin',
  'budget.manage':    'admin',
  'members.manage':   'admin',
  'documents.manage': 'admin',
  'roles.assign':     'admin',
}

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'proposals.edit':   'Edit proposals',
  'proposals.delete': 'Delete proposals',
  'tasks.edit':       'Edit tasks',
  'tasks.delete':     'Delete tasks',
  'payments.edit':    'Edit payment details',
  'budget.manage':    'Manage budget (add / edit / delete lines)',
  'members.manage':   'Manage members (add / edit / delete)',
  'documents.manage': 'Manage documents (upload / delete)',
  'roles.assign':     'Assign board roles',
}

const BOARD_ROLES = new Set([
  'board_member',
  'board_president',
  'board_vp',
  'board_secretary',
  'board_treasurer',
  'board_arc',
])

// Module-level cache — one entry per cold start, expires after 60s
let cache: { data: PermissionsMap; expiresAt: number } | null = null
const TTL_MS = 60_000

export async function getPermissions(): Promise<PermissionsMap> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.data

  const row = await db.query.settings.findFirst({
    where: eq(settings.key, 'permissions'),
  })

  const stored = (row?.value ?? {}) as Partial<PermissionsMap>
  const merged: PermissionsMap = { ...PERMISSION_DEFAULTS, ...stored }

  cache = { data: merged, expiresAt: now + TTL_MS }
  return merged
}

export function invalidatePermissionsCache() {
  cache = null
}

export function hasPermission(
  threshold: PermissionThreshold,
  role: string | undefined | null,
  isAdminFlag: boolean | undefined | null
): boolean {
  if (!role) return false
  if (role === 'admin' || isAdminFlag === true) return true
  if (threshold === 'board') return BOARD_ROLES.has(role)
  return false
}
