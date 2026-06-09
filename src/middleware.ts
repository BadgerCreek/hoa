import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const BOARD_ROLES = ['board_member', 'board_president', 'board_vp', 'board_secretary', 'board_treasurer', 'board_arc', 'admin']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const BOARD_PATHS = ['/dashboard', '/agents', '/tasks', '/proposals', '/members', '/directory', '/budget', '/payments', '/arc', '/maintenance', '/meetings', '/settings']
  const isBoardPath = BOARD_PATHS.some((p) => pathname.startsWith(p))
  const isApiPath = pathname.startsWith('/api/agents') || pathname.startsWith('/api/tasks') || pathname.startsWith('/api/proposals') || pathname.startsWith('/api/arc') || pathname.startsWith('/api/payments') || pathname.startsWith('/api/members')

  if (!session) {
    if (isBoardPath || isApiPath) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  if (isBoardPath) {
    const role = (session.user as { role?: string }).role
    const isArcMember = (session.user as { isArcMember?: boolean }).isArcMember
    if (!isArcMember && (!role || !BOARD_ROLES.includes(role))) {
      return NextResponse.redirect(new URL('/portal', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|board-members).*)'],
}
