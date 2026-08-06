"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  isTouched?: boolean
  icon?: React.ReactNode
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, isTouched, icon, hint, id, ...props }, ref) => {
    // Show error only if field has been interacted with (touched) and an error exists
    const showError = !!(error && isTouched)
    const inputId = id || React.useId()
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {/* Label and optional hint */}
        {label && (
          <div className="flex items-baseline justify-between px-0.5">
            <label
              htmlFor={inputId}
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {label}
            </label>
            {hint && !showError && (
              <span id={hintId} className="text-xs text-muted-foreground opacity-80">
                {hint}
              </span>
            )}
          </div>
        )}

        {/* Input container */}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none transition-colors group-focus-within:text-primary">
              {icon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            ref={ref}
            aria-describedby={cn(showError ? errorId : undefined, hint ? hintId : undefined)}
            aria-invalid={showError ? "true" : "false"}
            className={cn(
              "flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm ring-offset-background transition-all placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-10",
              showError && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20 bg-destructive/[0.01]",
              !showError && isTouched && "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20",
              className
            )}
            {...props}
          />
        </div>

        {/* Animated error message */}
        <AnimatePresence initial={false}>
          {showError && (
            <motion.div
              id={errorId}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <span className="flex items-center gap-1.5 text-xs text-destructive font-medium mt-0.5 px-0.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
