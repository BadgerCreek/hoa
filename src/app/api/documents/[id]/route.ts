import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { db } from '@/db'
import { documents, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getPermissions, hasPermission } from '@/lib/permissions'

export async function DELETE(
  _req: Request,
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
  const doc = await db.query.documents.findFirst({ where: eq(documents.id, id) })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await del(doc.fileUrl)
  await db.delete(documents).where(eq(documents.id, id))

  await db.insert(auditLogs).values({
    action: 'document.deleted',
    entityType: 'document',
    entityId: id,
    performedBy: session.user.id,
    details: { title: doc.title },
  })

  return NextResponse.json({ ok: true })
}
