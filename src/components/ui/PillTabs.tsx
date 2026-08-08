import { cn } from '@/lib/cn'

type PillTabsProps<T extends string> = {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  /** `bare` matches the top-row tabs; `boxed` matches the in-card range selector. */
  variant?: 'bare' | 'boxed'
  label?: string
  className?: string
}

export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  variant = 'bare',
  label,
  className,
}: PillTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto',
        variant === 'boxed' && 'rounded-full border border-white/8 bg-black/25 p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={cn(
              'focus-ring rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition',
              variant === 'bare' && !active && 'border border-white/8 bg-white/4 text-mist-300',
              variant === 'boxed' && !active && 'text-mist-400 hover:text-mist-50',
              active && 'accent-gradient text-ink-950 font-semibold',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
