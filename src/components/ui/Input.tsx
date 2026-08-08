import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: ReactNode
  icon?: ReactNode
}

export function Input({ label, hint, icon, className, ...rest }: InputProps) {
  const id = useId()
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-mist-300">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-mist-500">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={cn(
            'focus-ring h-12 w-full rounded-2xl border border-white/8 bg-black/30 px-4 text-base',
            'text-mist-50 placeholder:text-mist-500 transition focus:border-accent-500/40',
            icon && 'pl-11',
            className,
          )}
          {...rest}
        />
      </div>
      {hint && <p className="text-xs text-mist-500">{hint}</p>}
    </div>
  )
}
