import { Delete } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { seededShuffle } from '@/lib/cardMapping'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * On-screen numeric keypad with the digits in a fresh random order every time
 * it re-renders with a new `shuffleKey`. Layout is a 3×3 grid of digits plus a
 * bottom row of [backspace, last digit, blank]. Tapping keys instead of typing
 * keeps entry away from keyloggers.
 */
export function ShuffledKeypad({
  onDigit,
  onBackspace,
  disabled = false,
  shuffleKey = 0,
}: {
  onDigit: (digit: string) => void
  onBackspace: () => void
  disabled?: boolean
  /** Changing this value lays the digits out in a new random order. */
  shuffleKey?: number
}) {
  const digits = useMemo(() => seededShuffle(DIGITS, shuffleKey), [shuffleKey])
  const grid = digits.slice(0, 9)
  const tail = digits[9]

  const keyClass = cn(
    'focus-ring grid size-14 place-items-center rounded-2xl border border-white/8 bg-black/30',
    'text-xl font-semibold tabular-nums transition',
    'hover:bg-white/8 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
  )

  return (
    <div
      role="group"
      aria-label="Numeric keypad"
      className="mx-auto grid w-fit grid-cols-3 gap-2.5"
    >
      {grid.map((digit) => (
        <button
          key={digit}
          type="button"
          onClick={() => onDigit(digit)}
          disabled={disabled}
          aria-label={`Digit ${digit}`}
          className={keyClass}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled}
        aria-label="Delete last digit"
        className={keyClass}
      >
        <Delete size={20} />
      </button>
      <button
        type="button"
        onClick={() => onDigit(tail)}
        disabled={disabled}
        aria-label={`Digit ${tail}`}
        className={keyClass}
      >
        {tail}
      </button>
      <span aria-hidden className="size-14" />
    </div>
  )
}
