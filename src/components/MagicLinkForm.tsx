'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      setError('Enter a valid email address')
      return
    }
    setLoading(true)
    setError('')
    const result = await signIn('resend', { email: trimmed, redirect: false, callbackUrl: '/portal' })
    setLoading(false)
    if (result?.error) {
      setError('Something went wrong — try again or use Google sign-in')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center space-y-3">
        <div className="text-3xl">📬</div>
        <p className="font-medium text-sm">Check your email</p>
        <p className="text-xs text-muted-foreground">
          We sent a sign-in link to <strong>{email}</strong>.<br />
          It expires in 10 minutes. Check your spam folder if needed.
        </p>
        <button
          onClick={() => { setSent(false); setEmail('') }}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={loading}
        autoComplete="email"
        className="bg-white/70"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" variant="outline" className="w-full" disabled={loading || !email.trim()}>
        {loading ? 'Sending…' : 'Send magic link'}
      </Button>
    </form>
  )
}
