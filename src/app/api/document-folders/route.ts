import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { documentFolders, auditLogs } from '@/db/schema'
import { getPermissions, hasPermission } from '@/lib/permissions'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  const perms = await getPermissions()
  if (!hasPermission(perms['documents.manage'], userRole, userIsAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, visibleToResidents } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const [folder] = await db.insert(documentFolders).values({
    name: name.trim(),
    visibleToResidents: !!visibleToResidents,
    createdBy: session.user.id,
  }).returning()

  await db.insert(auditLogs).values({
    action: 'document_folder.created',
    entityType: 'document_folder',
    entityId: folder.id,
    performedBy: session.user.id,
    details: { name: folder.name, visibleToResidents: folder.visibleToResidents },
  })

  return NextResponse.json({ ok: true, folder })
}
