import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MagicLinkForm } from '@/components/MagicLinkForm'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/hero.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <Card className="relative w-full max-w-sm mx-4 bg-zinc-900/60 backdrop-blur-sm shadow-xl text-white">
        <CardHeader className="text-center px-8 pt-8 pb-4">
          <CardTitle className="text-2xl">Badger Creek Ranch HOA</CardTitle>
          <CardDescription className="mt-1 text-zinc-400">Sign in to access your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-8 pb-8">
          <MagicLinkForm />

          <GoogleSignInButton />
        </CardContent>
      </Card>
    </div>
  )
}
