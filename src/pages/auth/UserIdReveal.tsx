import { Check, Copy, IdCard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Wordmark } from '@/components/layout/Sidebar'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Splash } from '@/components/ui/Splash'
import { readableAuthError } from '@/auth/passkeys'
import { retryTransient } from '@/lib/retry'
import { ensureUserId, formatUserId } from '@/lib/userId'

/**
 * Shown once after email verification. The ID is allocated by Postgres (0006)
 * rather than generated here, so the format and collision handling stay off the
 * client entirely.
 */
export function UserIdReveal({ onContinue }: { onContinue: () => void }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true

    retryTransient(() => ensureUserId())
      .then((result) => {
        if (active) setUserId(result.user_id)
      })
      .catch((err) => {
        if (active) setError(readableAuthError(err))
      })

    return () => {
      active = false
    }
  }, [])

  async function copy() {
    if (!userId) return
    try {
      await navigator.clipboard.writeText(userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the ID is on screen to read regardless.
    }
  }

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-5">
          <Wordmark />
          <Card className="p-6 sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight">Couldn't create your User ID</h1>
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
            <Button className="mt-5 w-full" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  if (!userId) return <Splash message="Creating your User ID…" />

  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-5">
        <Wordmark />

        <Card className="p-6 sm:p-8" glow>
          <span className="accent-gradient grid size-12 place-items-center rounded-2xl text-on-accent">
            <IdCard size={23} strokeWidth={2.2} />
          </span>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">This is your User ID</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist-400">
            You'll use it to sign in from now on. There's no email field on the sign-in screen.
          </p>

          <div className="glass-tile mt-6 p-5 text-center">
            <p className="font-mono text-2xl font-bold tracking-[0.25em] tabular-nums sm:text-3xl">
              {formatUserId(userId)}
            </p>
          </div>

          <Button variant="outline" className="mt-3 w-full" onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy User ID'}
          </Button>

          <Alert tone="info" className="mt-5">
            Save this somewhere you can find it. You can always see it again under Settings.
          </Alert>

          <Button size="lg" className="mt-6 w-full" onClick={onContinue}>
            Continue
          </Button>
        </Card>
      </div>
    </div>
  )
}
