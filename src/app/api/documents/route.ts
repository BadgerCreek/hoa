import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/db'
import { documents, auditLogs } from '@/db/schema'

const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']
const VALID_CATEGORIES = ['minutes', 'financial', 'legal', 'maintenance', 'other'] as const

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!role || !BOARD_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  const title = (form.get('title') as string | null)?.trim()
  const category = form.get('category') as string | null

  if (!file || !title) {
    return NextResponse.json({ error: 'File and title are required.' }, { status: 400 })
  }

  const validCategory = VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])
    ? (category as typeof VALID_CATEGORIES[number])
    : 'other'

  const ext = file.name.split('.').pop() ?? 'bin'
  const filename = `hoa-docs/${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-')}.${ext}`

  const blob = await put(filename, file, { access: 'public' })

  const [doc] = await db.insert(documents).values({
    title,
    fileUrl: blob.url,
    category: validCategory,
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
