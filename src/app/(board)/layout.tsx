import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/SignOutButton'

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'AI Agents' },
  { href: '/proposals', label: 'Proposals' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/members', label: 'Board Members' },
]

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user as { role?: string }).role
  const BOARD_ROLES = ['board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'admin']
  if (!role || !BOARD_ROLES.includes(role)) redirect('/portal')


  const initials = session.user?.name?.split(' ').map((n) => n[0]).join('') ?? '?'

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-950 text-zinc-100 flex flex-col py-6 px-4 gap-2 fixed h-full">
        <div className="mb-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Badger Creek Ranch</p>
          <p className="text-sm text-zinc-300 mt-1">Board Portal</p>
        </div>
        <Separator className="bg-zinc-800 mb-2" />
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors"
          >
            {item.label}
          </Link>
        ))}
        <div className="mt-auto flex items-center gap-3 pt-4">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-zinc-700 text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate">{session.user?.name}</p>
            <p className="text-xs text-zinc-400 capitalize">{role?.replace('board_', '')}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  )
}
