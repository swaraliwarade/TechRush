import { useEffect, useRef, useState } from 'react'

const ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
] as const

/**
 * Counts down to `timeoutMs` of user inactivity, then fires `onIdle`.
 *
 * Returns milliseconds remaining so the caller can show a countdown — an
 * auto-lock that fires without warning reads as a bug rather than a feature.
 */
export function useIdleTimer({
  timeoutMs,
  onIdle,
  enabled = true,
}: {
  timeoutMs: number
  onIdle: () => void
  enabled?: boolean
}) {
  const [remaining, setRemaining] = useState(timeoutMs)
  const lastActivity = useRef(Date.now())

  // Held in a ref so an inline arrow function from the caller doesn't tear down
  // and re-register the listeners on every render.
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!enabled) return

    lastActivity.current = Date.now()
    setRemaining(timeoutMs)

    const markActive = () => {
      lastActivity.current = Date.now()
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true })
    }

    const interval = window.setInterval(() => {
      const left = timeoutMs - (Date.now() - lastActivity.current)
      setRemaining(Math.max(0, left))
      if (left <= 0) onIdleRef.current()
    }, 1000)

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive)
      }
      window.clearInterval(interval)
    }
  }, [enabled, timeoutMs])

  return remaining
}

export function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
