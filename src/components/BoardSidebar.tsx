'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/SignOutButton'
import { SidebarNav } from '@/components/SidebarNav'

interface Props {
  name: string
  initials: string
  role: string
}

export function BoardSidebar({ name, initials, role }: Props) {
  const [open, setOpen] = useState(false)

  const sidebarContent = (
    <>
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Badger Creek Ranch</p>
        <p className="text-sm text-zinc-300 mt-1">Board Portal</p>
      </div>
      <Separator className="bg-zinc-800 mb-3" />
      <SidebarNav onNavigate={() => setOpen(false)} />
      <div className="mt-auto flex items-center gap-3 pt-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-zinc-700 text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs truncate">{name}</p>
          <p className="text-xs text-zinc-400 capitalize">{role?.replace('board_', '')}</p>
        </div>
        <SignOutButton />
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-zinc-950 text-zinc-100 flex-col py-6 px-4 fixed h-full overflow-y-auto z-30">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 bg-zinc-950 text-zinc-100 px-4 py-3 border-b border-zinc-800">
        <button onClick={() => setOpen(true)} className="text-zinc-400 hover:text-zinc-100">
          <Menu className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium text-zinc-300">Board Portal</p>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 z-50 h-full w-64 bg-zinc-950 text-zinc-100 flex flex-col py-6 px-4 overflow-y-auto">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
