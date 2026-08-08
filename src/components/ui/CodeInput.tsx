import { useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

type CodeInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  label: string
  /** Renders dots instead of digits — used for PIN entry. */
  secret?: boolean
  autoFocus?: boolean
  disabled?: boolean
  onComplete?: (value: string) => void
}

/**
 * Segmented code entry. A single transparent input sits over the boxes so that
 * mobile keyboards, autofill of SMS/email codes, and paste all behave normally —
 * per-box inputs break all three.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  label,
  secret = false,
  autoFocus = false,
  disabled = false,
  onComplete,
}: CodeInputProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const cells = Array.from({ length }, (_, i) => value[i] ?? '')
  const activeIndex = Math.min(value.length, length - 1)

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-mist-300">
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, '').slice(0, length)
            onChange(next)
            if (next.length === length) onComplete?.(next)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          aria-label={label}
          className="absolute inset-0 z-10 h-full w-full cursor-default rounded-2xl bg-transparent text-transparent caret-transparent outline-none select-none"
        />
        {/* Longer codes get tighter spacing and type so 8-10 cells still fit at 375px. */}
        <div className={cn('flex', length > 6 ? 'gap-1.5' : 'gap-2 sm:gap-3')} aria-hidden>
          {cells.map((char, i) => {
            const isActive = focused && !disabled && i === activeIndex
            return (
              <div
                key={i}
                className={cn(
                  'flex h-14 min-w-0 flex-1 items-center justify-center rounded-2xl border font-semibold tabular-nums transition',
                  'border-white/8 bg-black/30',
                  length > 6 ? 'text-xl sm:text-2xl' : 'text-2xl',
                  isActive && 'border-accent-500/60 bg-black/50',
                  disabled && 'opacity-50',
                )}
              >
                {char ? (
                  secret ? (
                    <span className="size-2.5 rounded-full bg-mist-50" />
                  ) : (
                    char
                  )
                ) : (
                  <span className="text-mist-500">·</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
