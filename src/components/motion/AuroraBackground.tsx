import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

type Blob = {
  size: string
  color: string
  duration: number
  delay: number
  style: CSSProperties
}

// Deepwater Blue colours, heavy blur, slow drift — a living sky behind the
// glass. Deliberately quiet: low opacity, minute travel, ~minute-long loops.
// The goal is depth you can feel, not motion you can watch.
const BLOBS: Blob[] = [
  {
    size: '30rem',
    color: 'rgba(20, 184, 166, 0.15)',
    duration: 52,
    delay: 0,
    style: { top: '-12%', left: '-6%' },
  },
  {
    size: '24rem',
    color: 'rgba(103, 232, 249, 0.1)',
    duration: 64,
    delay: 6,
    style: { top: '30%', right: '-10%' },
  },
  {
    size: '20rem',
    color: 'rgba(14, 116, 144, 0.16)',
    duration: 56,
    delay: 12,
    style: { bottom: '-14%', left: '28%' },
  },
]

/**
 * Three large blurred blobs drifting on infinite loops. Transform-only animation
 * stays on the compositor, and MotionConfig reducedMotion="user" freezes it for
 * users who ask for less motion.
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {BLOBS.map((blob, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full blur-3xl"
          style={{
            width: blob.size,
            height: blob.size,
            backgroundColor: blob.color,
            ...blob.style,
          }}
          animate={{ x: [0, 24, -16, 0], y: [0, -18, 14, 0], scale: [1, 1.05, 0.97, 1] }}
          transition={{
            duration: blob.duration,
            delay: blob.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
