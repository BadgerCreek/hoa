'use server'

import { signIn, signOut } from '@/lib/auth'

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}

export async function signInWithGoogle() {
  await signIn('google', { redirectTo: '/portal' })
}
