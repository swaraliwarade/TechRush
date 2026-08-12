import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

type AnimatedNumberProps = {
  value: number
  /** Renders each tweened frame (e.g. formatMoney). Called every frame. */
  format: (value: number) => string
  duration?: number
}

/**
 * Counts `value` up/down instead of snapping, from 0 on first mount and between
 * changes afterwards. The formatter is read from a ref so an inline lambda does
 * not restart the animation on every render. Reduced-motion users get the final
 * figure instantly.
 */
export function AnimatedNumber({ value, format, duration = 1 }: AnimatedNumberProps) {
  const reduced = useReducedMotion()
  const formatRef = useRef(format)
  formatRef.current = format
  const valueRef = useRef(0)

  const [display, setDisplay] = useState(() => format(0))

  useEffect(() => {
    const from = valueRef.current
    if (reduced || from === value) {
      setDisplay(formatRef.current(value))
      valueRef.current = value
      return
    }
    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(formatRef.current(v)),
    })
    valueRef.current = value
    return () => controls.stop()
  }, [value, duration, reduced])

  return <>{display}</>
}
