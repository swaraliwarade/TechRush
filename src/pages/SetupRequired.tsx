import { KeyRound, Mail, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Wordmark } from '@/components/layout/Sidebar'
import { missingEnvKeys } from '@/lib/env'

const steps = [
  {
    icon: KeyRound,
    title: 'Supabase project',
    body: 'Create a free project, then copy the Project URL and the anon/publishable key from Project Settings → API Keys into .env.local.',
  },
  {
    icon: Mail,
    title: 'Resend as custom SMTP',
    body: 'Add the Resend API key under Authentication → Emails → SMTP Settings (host smtp.resend.com, port 587, user "resend"). Supabase\'s built-in SMTP caps at 2 emails/hour and will break OTP testing.',
  },
]

export function SetupRequired() {
  const missing = missingEnvKeys()

  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-2xl space-y-5">
        <Wordmark />

        <Card className="p-6 sm:p-8" glow>
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-warn-400/20 bg-warn-400/10 text-warn-400">
              <TriangleAlert size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Backend credentials required
              </h1>
              <p className="mt-1 text-sm text-mist-400">
                The app shell is running, but it has no Supabase project to talk to yet.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {missing.map((key) => (
              <Badge key={key} tone="warn">
                {key} missing
              </Badge>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="glass-tile flex gap-4 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-accent-400">
                    <Icon size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-mist-400">{step.body}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/6 bg-black/40 p-4 text-xs leading-relaxed text-mist-300">
            <code>{`# .env.local\nVITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon or publishable key>`}</code>
          </pre>
          <p className="mt-3 text-xs text-mist-500">
            Restart <span className="text-mist-300">npm run dev</span> after editing the file — Vite
            only reads env vars at startup.
          </p>
        </Card>
      </div>
    </div>
  )
}
