import Link from 'next/link'

export default function VerifyPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/hero.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-10 max-w-sm w-full text-center space-y-4">
        <div className="text-4xl">📬</div>
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A sign-in link has been sent to your email address.<br />
          It expires in <strong>10 minutes</strong> and can only be used once.
        </p>
        <p className="text-xs text-muted-foreground">
          Didn't get it? Check your spam folder.
        </p>
        <Link href="/login" className="block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
