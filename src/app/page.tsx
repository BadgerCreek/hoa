import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function HomePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user as { role?: string }).role
  const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']
  redirect(role && BOARD_ROLES.includes(role) ? '/dashboard' : '/portal')
}
