import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { documentFolders } from '@/db/schema'
import { eq } from 'drizzle-orm'
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

  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids must be an array' }, { status: 400 })

  await Promise.all(
    ids.map((id, index) =>
      db.update(documentFolders).set({ sortOrder: index }).where(eq(documentFolders.id, id))
    )
  )

  return NextResponse.json({ ok: true })
}
