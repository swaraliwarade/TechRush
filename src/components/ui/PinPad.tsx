import { Delete } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/cn'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

export function PinPad({
  value,
  onChange,
  length,
  disabled = false,
  onComplete,
}: {
  value: string
  onChange: (next: string) => void
  length: number
  disabled?: boolean
  onComplete?: (value: string) => void
}) {
  function press(key: string) {
    if (disabled) return
    if (key === 'del') {
      onChange(value.slice(0, -1))
      return
    }
    if (value.length >= length) return

    const next = value + key
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  // A physical keyboard should work too — the pad is for touch, not a
  // replacement for typing.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (disabled) return
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') press('del')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  return (
    <div className="mx-auto grid max-w-[280px] grid-cols-3 gap-2.5">
      {KEYS.map((key, i) =>
        key === '' ? (
          <div key={`spacer-${i}`} />
        ) : (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => press(key)}
            aria-label={key === 'del' ? 'Delete last digit' : key}
            className={cn(
              'focus-ring grid h-14 place-items-center rounded-2xl border border-white/8 bg-white/4 text-xl font-semibold tabular-nums transition',
              'hover:border-white/16 hover:bg-white/8 active:scale-95',
              'disabled:opacity-40 disabled:hover:bg-white/4 disabled:active:scale-100',
            )}
          >
            {key === 'del' ? <Delete size={19} className="text-mist-300" /> : key}
          </button>
        ),
      )}
    </div>
  )
}

/** Filled/empty dots showing progress without revealing the digits. */
export function PinDots({
  filled,
  length,
  error = false,
}: {
  filled: number
  length: number
  error?: boolean
}) {
  return (
    <div className="flex justify-center gap-3" aria-hidden>
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className={cn(
            'size-3.5 rounded-full border transition',
            i < filled
              ? error
                ? 'border-loss-400 bg-loss-400'
                : 'border-accent-400 bg-accent-400'
              : 'border-white/20 bg-transparent',
          )}
        />
      ))}
    </div>
  )
}
