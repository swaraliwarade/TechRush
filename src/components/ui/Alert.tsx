import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'error' | 'success' | 'info' | 'warn'

const styles: Record<Tone, { wrap: string; icon: ReactNode }> = {
  error: {
    wrap: 'border-loss-400/20 bg-loss-400/8 text-loss-400',
    icon: <TriangleAlert size={16} />,
  },
  success: {
    wrap: 'border-gain-400/20 bg-gain-400/8 text-gain-400',
    icon: <CircleCheck size={16} />,
  },
  info: {
    wrap: 'border-white/10 bg-white/5 text-mist-300',
    icon: <Info size={16} />,
  },
  warn: {
    wrap: 'border-warn-400/20 bg-warn-400/8 text-warn-400',
    icon: <TriangleAlert size={16} />,
  },
}

export function Alert({
  tone = 'info',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  const style = styles[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm leading-relaxed',
        style.wrap,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <span>{children}</span>
    </div>
  )
}
