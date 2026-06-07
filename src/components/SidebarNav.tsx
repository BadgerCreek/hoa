'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

type NavItem = { section: string; items: { href: string; label: string }[] }

const nav: NavItem[] = [
  {
    section: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/agents', label: 'AI Agents' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { href: '/proposals', label: 'Proposals' },
      { href: '/tasks', label: 'Tasks' },
      { href: '/budget', label: 'Budget' },
      { href: '/payments', label: 'Payments' },
      { href: '/arc', label: 'Review Committee' },
    ],
  },
  {
    section: 'Community',
    items: [
      { href: '/directory', label: 'Directory' },
      { href: '/maintenance', label: 'Maintenance' },
      { href: '/violations', label: 'Violations' },
      { href: '/meetings', label: 'Meetings' },
    ],
  },
  {
    section: 'Board',
    items: [
      { href: '/members', label: 'Board Members' },
    ],
  },
]

function NavSection({
  section,
  items,
  pathname,
  onNavigate,
}: {
  section: string
  items: { href: string; label: string }[]
  pathname: string
  onNavigate?: () => void
}) {
  const hasActive = items.some((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
  const [open, setOpen] = useState(hasActive || section === 'Overview')

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 mt-2 rounded-md group hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
          {section}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
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
        </div>
      )}
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col">
      {nav.map((section) => (
        <NavSection
          key={section.section}
          section={section.section}
          items={section.items}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}
