import { motion } from 'motion/react'
import type { ReactNode } from 'react'

type RevealProps = {
  children?: ReactNode
  /** Stagger offset in seconds — pass index * step for cascading entries. */
  delay?: number
  className?: string
}

/**
 * Fade + rise on first scroll into view. `once: true` keeps re-scrolling calm,
 * and MotionConfig reducedMotion="user" collapses it to a static render.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
