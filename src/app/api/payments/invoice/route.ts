import { auth } from '@/lib/auth'
import { put } from '@vercel/blob'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'board_arc', 'admin']

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !BOARD_ROLES.includes(userRole)) {
    return new Response('Forbidden', { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return new Response('No file', { status: 400 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const filename = `hoa-invoices/${Date.now()}-invoice.${ext}`

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type || 'application/octet-stream',
  })

  return Response.json({ url: blob.url })
}
