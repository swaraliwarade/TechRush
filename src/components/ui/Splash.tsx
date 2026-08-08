import { ShieldCheck } from 'lucide-react'

export function Splash({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center p-8">
      <div className="flex flex-col items-center gap-4">
        <span className="accent-gradient grid size-12 animate-pulse place-items-center rounded-2xl text-ink-950">
          <ShieldCheck size={24} strokeWidth={2.4} />
        </span>
        <p className="text-sm text-mist-400">{message}</p>
      </div>
    </div>
  )
}
