"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DialogProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Dialog({ isOpen, onClose, children, className }: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  // Handle ESC key or other browser close events
  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => {
      onClose()
    }

    dialog.addEventListener("close", handleClose)
    return () => dialog.removeEventListener("close", handleClose)
  }, [onClose])

  // Fallback for browsers without closedby support
  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!isOpen) return

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return

        const rect = dialog.getBoundingClientRect()
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width

        if (!isDialogContent) {
          onClose()
        }
      }

      dialog.addEventListener("click", handleBackdropClick)
      return () => dialog.removeEventListener("click", handleBackdropClick)
    }
  }, [isOpen, onClose])

  return (
    <dialog
      ref={dialogRef}
      // @ts-ignore - closedby is a newer HTML attribute
      closedby="any"
      className={cn(
        "fixed inset-0 m-auto max-w-md w-[calc(100%-2rem)] rounded-2xl border border-border bg-card p-0 shadow-2xl focus:outline-none",
        "transition-all duration-300 ease-out",
        "open:opacity-100 open:scale-100 open:flex flex-col",
        "opacity-0 scale-95",
        className
      )}
    >
      <div className="absolute right-4 top-4 z-50">
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </dialog>
  )
}
