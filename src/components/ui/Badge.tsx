import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'gain' | 'loss' | 'neutral' | 'accent' | 'warn'

const tones: Record<Tone, string> = {
  gain: 'bg-gain-400/12 text-gain-400 border-gain-400/20',
  loss: 'bg-loss-400/12 text-loss-400 border-loss-400/20',
  warn: 'bg-warn-400/12 text-warn-400 border-warn-400/20',
  accent: 'bg-accent-500/15 text-accent-400 border-accent-500/25',
  neutral: 'bg-white/6 text-mist-300 border-white/10',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
