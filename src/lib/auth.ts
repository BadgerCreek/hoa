import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import { Resend as ResendClient } from 'resend'
import { db } from '@/db'
import { accounts, sessions, users, verificationTokens } from '@/db/schema'

const resend = new ResendClient(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Badger Creek Ranch HOA <noreply@badgercreekranch.org>'

function magicLinkEmail(url: string, email: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden">
        <tr>
          <td style="background:#09090b;padding:28px 40px;text-align:center">
            <p style="margin:0;color:#a1a1aa;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:600">Badger Creek Ranch</p>
            <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:700">HOA Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <p style="margin:0 0 8px;color:#09090b;font-size:22px;font-weight:700">Your sign-in link</p>
            <p style="margin:0 0 32px;color:#71717a;font-size:15px;line-height:1.6">
              Click the button below to sign in to the Badger Creek Ranch HOA portal.
              This link expires in <strong>10 minutes</strong> and can only be used once.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px">
              <tr>
                <td style="border-radius:8px;background:#09090b">
                  <a href="${url}" style="display:block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:.01em">
                    Sign in to HOA Portal →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#a1a1aa;font-size:12px;text-align:center">Or copy and paste this link:</p>
            <p style="margin:0;background:#f4f4f5;border-radius:6px;padding:12px;font-family:monospace;font-size:11px;color:#52525b;word-break:break-all;text-align:center">${url}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f4f4f5;text-align:center">
            <p style="margin:0;color:#a1a1aa;font-size:12px">
              This link was requested for <strong>${email}</strong>.<br>
              If you didn't request this, you can safely ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google,
    Resend({
      from: FROM,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const { error } = await resend.emails.send({
          from: FROM,
          to: email,
          subject: 'Your sign-in link — Badger Creek Ranch HOA',
          html: magicLinkEmail(url, email),
        })
        if (error) throw new Error(`Magic link send failed: ${error.message}`)
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/login/verify',
  },
})
