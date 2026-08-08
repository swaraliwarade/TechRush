import { Fingerprint, Lock, ShieldAlert, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { failedPinAttemptsToday } from '@/lib/pin'
import { useSecurity } from '@/security/SecurityProvider'

function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'neutral',
}: {
  icon: typeof Fingerprint
  label: string
  value: string | number
  caption: string
  tone?: 'neutral' | 'alert'
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            tone === 'alert'
              ? 'border border-loss-400/25 bg-loss-400/12 text-loss-400'
              : 'bg-white/6 text-accent-400',
          )}
        >
          <Icon size={18} />
        </span>
        <Badge tone={tone === 'alert' ? 'loss' : 'neutral'}>{label}</Badge>
      </div>

      <p
        className={cn(
          'mt-4 text-3xl font-bold tracking-tight tabular-nums',
          tone === 'alert' && 'text-loss-400',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-mist-400">{caption}</p>
    </Card>
  )
}

/**
 * Business landing screen. Deliberately carries no balance or transaction data
 * at all — not blurred, not partial, not fetched. Anything sensitive lives
 * behind the PIN gate on /vault, so a shoulder-surfer sees nothing of value
 * before the PIN is entered.
 */
export function BusinessDashboard() {
  const navigate = useNavigate()
  const { passkeys, devices, pin, loading } = useSecurity()
  const [failedToday, setFailedToday] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    failedPinAttemptsToday()
      .then((count) => {
        if (active) setFailedToday(count)
      })
      // A failed count is cosmetic; don't block the screen over it.
      .catch(() => {
        if (active) setFailedToday(0)
      })
    return () => {
      active = false
    }
  }, [])

  const dash = (value: number | null) => (loading || value === null ? '—' : value)

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Locked vault */}
        <Card className="flex flex-col justify-center p-6 text-center sm:p-10" glow>
          <span className="mx-auto grid size-16 place-items-center rounded-3xl border border-white/10 bg-black/30 text-mist-300">
            <Lock size={28} />
          </span>

          <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">Vault</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mist-400">
            Your balance and transaction history are locked. Enter your PIN to open the vault — it
            re-locks automatically after three minutes of inactivity.
          </p>

          <div className="mt-6 flex justify-center">
            <Button size="lg" onClick={() => navigate('/vault')}>
              <Lock size={17} />
              Unlock vault
            </Button>
          </div>

          <div className="mt-6 flex justify-center">
            <Badge tone={pin?.configured ? 'neutral' : 'warn'}>
              {pin?.configured ? 'PIN configured' : 'PIN not set up yet'}
            </Badge>
          </div>
        </Card>

        {/* Non-sensitive status */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <StatCard
            icon={Fingerprint}
            label="passkeys"
            value={dash(passkeys.length)}
            caption={
              passkeys.length === 1 ? '1 active credential' : `${passkeys.length} active credentials`
            }
          />
          <StatCard
            icon={Smartphone}
            label="devices"
            value={dash(devices.length)}
            caption="Recognized without an email code"
          />
          <StatCard
            icon={ShieldAlert}
            label="today"
            value={dash(failedToday)}
            caption="Failed PIN attempts since midnight"
            tone={failedToday && failedToday > 0 ? 'alert' : 'neutral'}
          />
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader title="Why this screen is empty" />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist-400">
          A business account shows no financial data until the vault is unlocked. Nothing on this
          page is fetched from your ledger, so an unlocked laptop reveals only that an account
          exists — not what is in it.
        </p>
      </Card>
    </div>
  )
}
