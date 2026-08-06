"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, Shield, Laptop, LogOut, ChevronDown, CheckCircle2, Copy, Sparkles, KeyRound } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

export interface AccountHeaderMenuProps {
  customerName: string
  customerId: string
  email: string
  phone?: string
  onOpenDeviceHistory: () => void
}

export function AccountHeaderMenu({
  customerName,
  customerId,
  email,
  phone,
  onOpenDeviceHistory,
}: AccountHeaderMenuProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [showAccountDetails, setShowAccountDetails] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleCopyId = () => {
    navigator.clipboard.writeText(customerId || "TP-849102")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = () => {
    sessionStorage.removeItem("trustpass_customer_name")
    sessionStorage.removeItem("trustpass_account_id")
    sessionStorage.removeItem("trustpass_selected_bank")
    router.push("/signup")
  }

  const initials = customerName
    ? customerName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "TP"

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Account Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-border/60 bg-card/80 hover:bg-muted/60 backdrop-blur-md transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-primary text-primary-foreground font-bold text-xs flex items-center justify-center shadow-md">
          {initials}
        </div>
        <div className="flex flex-col text-left hidden sm:flex">
          <span className="text-xs font-bold text-foreground line-clamp-1 leading-tight">
            {customerName || "Account User"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {customerId || "TP-849102"}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl bg-card border border-border/80 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
          >
            {/* Header info */}
            <div className="p-4 bg-muted/30 border-b border-border/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-foreground truncate">
                    {customerName || "Valued Customer"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{email || "customer@trustpass.bank"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Passkey Protected
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold">Active</span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setShowAccountDetails(true)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
              >
                <User className="h-4 w-4 text-primary" />
                <span>Account Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  onOpenDeviceHistory()
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
              >
                <Laptop className="h-4 w-4 text-indigo-500" />
                <div className="flex flex-col">
                  <span>Login & Device History</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Registered passkeys & active sessions</span>
                </div>
              </button>

              <div className="my-1 border-t border-border/50" />

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Details Dialog */}
      <Dialog isOpen={showAccountDetails} onClose={() => setShowAccountDetails(false)} className="sm:max-w-md">
        <div className="p-6 flex flex-col gap-5 text-left">
          <div className="flex items-center gap-3 border-b border-border/50 pb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Customer Profile Details</h3>
              <p className="text-xs text-muted-foreground">Your verified account information</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</span>
                <span className="text-sm font-bold text-foreground">{customerName || "Demo Customer"}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer ID</span>
                <span className="text-sm font-mono font-bold text-foreground">{customerId || "TP-849102"}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopyId} className="h-8 px-2.5 text-xs text-primary">
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registered Email</span>
                <span className="text-xs font-medium text-foreground">{email || "customer@trustpass.bank"}</span>
              </div>
            </div>

            {phone && (
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</span>
                  <span className="text-xs font-medium text-foreground">{phone}</span>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-primary/[0.04] border border-primary/20 flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-primary shrink-0" />
              <div className="flex flex-col text-xs">
                <span className="font-bold text-foreground">Passkey Biometrics Active</span>
                <span className="text-[11px] text-muted-foreground">Touch ID / Face ID configured for passwordless login.</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="outline" onClick={() => setShowAccountDetails(false)} className="h-9 px-4">
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
