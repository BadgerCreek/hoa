import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { documentFolders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getPermissions, hasPermission } from '@/lib/permissions'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  const perms = await getPermissions()
  if (!hasPermission(perms['documents.manage'], userRole, userIsAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { visibleToResidents } = await req.json()

  const updated = await db.update(documentFolders)
    .set({ visibleToResidents: !!visibleToResidents })
    .where(eq(documentFolders.id, id))
    .returning({ id: documentFolders.id })

  if (updated.length === 0) return NextResponse.json({ error: 'Folder not found.' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
