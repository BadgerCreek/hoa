import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BoardSidebar } from '@/components/BoardSidebar'

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user as { role?: string }).role
  const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']
  if (!role || !BOARD_ROLES.includes(role)) redirect('/portal')

  const name = session.user?.name ?? ''
  const initials = name.split(' ').map((n) => n[0]).join('') || '?'

  return (
    <div className="min-h-screen flex">
      <BoardSidebar name={name} initials={initials} role={role} />
      <main className="flex-1 md:ml-56 pt-14 md:pt-8 p-4 md:p-8">{children}</main>
    </div>
  )
}
