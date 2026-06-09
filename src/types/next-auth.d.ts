import 'next-auth'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    isAdmin?: boolean | null
    isArcMember?: boolean | null
    role?: string | null
  }
  interface Session {
    user: {
      id: string
      isAdmin?: boolean | null
      isArcMember?: boolean | null
      role?: string | null
    } & DefaultSession['user']
  }
}
