import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type CardProps = {
  children: ReactNode
  className?: string
  /** Adds the soft purple bloom used on feature cards in the reference design. */
  glow?: boolean
}

export function Card({ children, className, glow = false }: CardProps) {
  return (
    <section className={cn('glass-card relative overflow-hidden', className)}>
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-accent-500/25 blur-3xl"
        />
      )}
      <div className="relative">{children}</div>
    </section>
  )
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
      {action}
    </div>
  )
}
