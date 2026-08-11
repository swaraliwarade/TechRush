import { BookOpen, Fingerprint, LifeBuoy, ShieldAlert, Smartphone } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'

const topics = [
  {
    icon: Fingerprint,
    title: "My passkey isn't offered",
    body: 'Passkeys are bound to the site they were created on. If you enrolled on a different domain, sign in with an email code and add a passkey here.',
  },
  {
    icon: Smartphone,
    title: 'Signing in on a borrowed computer',
    body: 'Choose "use a phone or tablet" at the passkey prompt and scan the QR code. Your key never leaves your phone, and nothing is left behind on that machine.',
  },
  {
    icon: BookOpen,
    title: 'I forgot my vault PIN',
    body: 'After four incorrect attempts the vault locks for 15 minutes. Contact your account administrator to reset it — PINs are stored hashed and cannot be recovered.',
  },
  {
    icon: ShieldAlert,
    title: 'Keeping your account safe',
    body: 'Never share a PIN, and enter it only when nobody can see your screen. If you think someone knows one of your PINs, contact your administrator to have them reset.',
  },
]

export function Support() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card className="p-5 sm:p-6">
        <CardHeader title="Common questions" />
        <div className="mt-4 space-y-3">
          {topics.map((topic) => {
            const Icon = topic.icon
            return (
              <div key={topic.title} className="glass-tile flex gap-4 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-accent-400">
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{topic.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-mist-400">{topic.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-5 sm:p-6" glow>
        <CardHeader title="Contact" />
        <span className="accent-gradient mt-5 grid size-11 place-items-center rounded-2xl text-on-accent">
          <LifeBuoy size={20} />
        </span>
        <p className="mt-4 text-sm leading-relaxed text-mist-400">
          TrustPass support is available to account administrators. For anything urgent involving
          account access, contact your security team directly rather than replying to email.
        </p>
        <p className="mt-4 text-sm font-medium">security@trustpass.demo</p>
        <p className="mt-1 text-xs text-mist-500">Demo application — not a monitored address.</p>
      </Card>
    </div>
  )
}
