import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/db'
import { documents, auditLogs, documentFolders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getPermissions, hasPermission } from '@/lib/permissions'

const VALID_CATEGORIES = ['minutes', 'financial', 'legal', 'maintenance', 'other'] as const

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = session.user.role ?? null
  const userIsAdmin = session.user.isAdmin ?? false
  const perms = await getPermissions()
  if (!hasPermission(perms['documents.manage'], userRole, userIsAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  const title = (form.get('title') as string | null)?.trim()
  const category = form.get('category') as string | null
  const folderIdRaw = (form.get('folderId') as string | null)?.trim() || null

  if (!file || !title) {
    return NextResponse.json({ error: 'File and title are required.' }, { status: 400 })
  }

  const validCategory = VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])
    ? (category as typeof VALID_CATEGORIES[number])
    : 'other'

  const ext = file.name.split('.').pop() ?? 'bin'
  const filename = `hoa-docs/${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-')}.${ext}`

  let blob: Awaited<ReturnType<typeof put>>
  try {
    blob = await put(filename, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Blob upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Validate folderId exists if provided
  let folderId: string | null = null
  if (folderIdRaw) {
    const folder = await db.select({ id: documentFolders.id }).from(documentFolders).where(eq(documentFolders.id, folderIdRaw)).limit(1)
    if (folder.length === 0) return NextResponse.json({ error: 'Folder not found.' }, { status: 400 })
    folderId = folderIdRaw
  }

  const [doc] = await db.insert(documents).values({
    title,
    fileUrl: blob.url,
    category: validCategory,
    folderId,
    uploadedBy: session.user.id,
  }).returning()

  await db.insert(auditLogs).values({
    action: 'document.uploaded',
    entityType: 'document',
    entityId: doc.id,
    performedBy: session.user.id,
    details: { title, category: validCategory, url: blob.url },
  })

  return NextResponse.json({ ok: true, document: doc })
}
