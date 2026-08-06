"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Send, Plus, ArrowDownLeft, Shield, TrendingUp, CreditCard, Copy, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface BalanceCardProps {
  totalBalance: number
  checkingBalance: number
  savingsBalance: number
  onOpenSendModal: () => void
  onOpenDepositModal: () => void
}

export function BalanceCard({
  totalBalance,
  checkingBalance,
  savingsBalance,
  onOpenSendModal,
  onOpenDepositModal,
}: BalanceCardProps) {
  const [isHidden, setIsHidden] = React.useState(false)
  const [copiedChecking, setCopiedChecking] = React.useState(false)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val)
  }

  const handleCopyChecking = () => {
    navigator.clipboard.writeText("8491028391")
    setCopiedChecking(true)
    setTimeout(() => setCopiedChecking(false), 2000)
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Primary Balance Glassmorphic Card (Spans 2 cols on lg screens) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col justify-between gap-6 group"
      >
        {/* Background decorative glow elements */}
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none group-hover:bg-primary/15 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        {/* Top bar with Label & Hide Toggle */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Account Net Worth
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHidden((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/50"
          >
            {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{isHidden ? "Show Balance" : "Hide"}</span>
          </button>
        </div>

        {/* Main Balance Display */}
        <div className="relative z-10 flex flex-col gap-2">
          <span className="text-3xl sm:text-5xl font-black tracking-tight text-foreground font-mono">
            {isHidden ? "••••••••••" : formatCurrency(totalBalance)}
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="h-3.5 w-3.5" />
              +₹12,400.50 (+5.2%)
            </span>
            <span className="text-muted-foreground font-normal">this month</span>
          </div>
        </div>

        {/* Breakdown Row: Checking & Savings */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Everyday Checking</span>
              <button
                type="button"
                onClick={handleCopyChecking}
                className="text-[10px] text-primary hover:underline flex items-center gap-1"
              >
                {copiedChecking ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>••8391</span>
              </button>
            </div>
            <span className="text-lg font-bold text-foreground font-mono">
              {isHidden ? "••••••" : formatCurrency(checkingBalance)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">High-Yield Savings</span>
              <span className="text-[10px] text-muted-foreground font-mono">••9402 (7.2% APY)</span>
            </div>
            <span className="text-lg font-bold text-foreground font-mono">
              {isHidden ? "••••••" : formatCurrency(savingsBalance)}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 pt-2">
          <Button
            onClick={onOpenSendModal}
            className="flex-1 h-12 text-sm font-bold shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/95 transition-all"
          >
            <Send className="mr-2 h-4.5 w-4.5" />
            Send Money
          </Button>

          <Button
            onClick={onOpenDepositModal}
            variant="outline"
            className="flex-1 h-12 text-sm font-bold border-border/80 hover:bg-muted/80 transition-all"
          >
            <Plus className="mr-2 h-4.5 w-4.5 text-primary" />
            Deposit Funds
          </Button>
        </div>
      </motion.div>

      {/* Security & Account Protection Badge Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between gap-5"
      >
        <div className="flex flex-col gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Passkey Vault Enclave</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Your account funds are shielded by hardware biometrics & zero-trust passkeys. No passwords required.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-muted/40 border border-border/40">
            <span className="text-muted-foreground font-medium">DICGC Insurance</span>
            <span className="font-bold text-foreground">Protected up to ₹5,00,000</span>
          </div>
          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-muted/40 border border-border/40">
            <span className="text-muted-foreground font-medium">Biometric Key</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Verified Touch ID</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/[0.04] border border-primary/20 text-[11px] text-muted-foreground text-center">
          ⚡ Transfers settle in under 2 seconds across TrustPass portals.
        </div>
      </motion.div>
    </div>
  )
}
