import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'accent-gradient text-ink-950 font-semibold shadow-[0_8px_24px_-8px_rgba(162,91,196,0.9)] hover:brightness-110',
  ghost: 'text-mist-300 hover:bg-white/6 hover:text-mist-50',
  outline:
    'border border-white/10 bg-white/4 text-mist-50 hover:border-white/20 hover:bg-white/8',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-2 rounded-full transition',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
