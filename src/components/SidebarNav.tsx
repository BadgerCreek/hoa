'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { section: 'Overview' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'AI Agents' },
  { section: 'Operations' },
  { href: '/proposals', label: 'Proposals' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/budget', label: 'Budget' },
  { href: '/payments', label: 'Payments' },
  { section: 'Community' },
  { href: '/directory', label: 'Directory' },
  { href: '/maintenance', label: 'Maintenance' },
  { href: '/arc', label: 'Review Committee' },
  { href: '/meetings', label: 'Meetings' },
  { section: 'Board' },
  { href: '/members', label: 'Board Members' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item, i) => {
        if ('section' in item) {
          return (
            <p key={i} className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 pt-4 pb-1 first:pt-0">
              {item.section}
            </p>
          )
        }
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm px-3 py-2 rounded-md transition-colors ${
              active
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
