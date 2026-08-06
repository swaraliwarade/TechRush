"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Plus, Fingerprint, CheckCircle2, ShieldAlert, ArrowRight, DollarSign, User, Tag } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  mode: "send" | "deposit"
  currentCheckingBalance: number
  onTransactionSuccess: (tx: {
    recipient: string
    amount: number
    type: "out" | "in"
    category: string
    note: string
  }) => void
}

const CATEGORIES = ["Transfer", "Shopping", "Bills & Utilities", "Dining & Food", "Personal", "Other"]

export function TransactionModal({
  isOpen,
  onClose,
  mode,
  currentCheckingBalance,
  onTransactionSuccess,
}: TransactionModalProps) {
  const [recipient, setRecipient] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [category, setCategory] = React.useState("Transfer")
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState("")

  const [step, setStep] = React.useState<"form" | "verifying" | "success">("form")

  React.useEffect(() => {
    if (isOpen) {
      setRecipient("")
      setAmount("")
      setCategory(mode === "send" ? "Transfer" : "Deposit")
      setNote("")
      setError("")
      setStep("form")
    }
  }, [isOpen, mode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

      const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than ₹0.00")
      return
    }

    if (mode === "send") {
      if (!recipient.trim()) {
        setError("Please enter recipient name, email, or account number.")
        return
      }

      if (numAmount > currentCheckingBalance) {
        setError(`Insufficient funds in checking account. Maximum available: ₹${currentCheckingBalance.toFixed(2)}`)
        return
      }
    }

    // Advance to Passkey Verification step
    setStep("verifying")

    // Simulate 2.2s passkey verification
    setTimeout(() => {
      onTransactionSuccess({
        recipient: mode === "send" ? recipient.trim() : "Direct Account Deposit",
        amount: numAmount,
        type: mode === "send" ? "out" : "in",
        category: mode === "send" ? category : "Deposit",
        note: note.trim(),
      })
      setStep("success")
    }, 2200)
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="sm:max-w-lg">
      <div className="p-6 sm:p-8 flex flex-col gap-6 text-left">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Dialog Header */}
              <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  {mode === "send" ? <Send className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {mode === "send" ? "Send Instant Transfer" : "Deposit Funds"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {mode === "send"
                      ? "Transfer money instantly using biometric passkey authorization."
                      : "Add funds directly into your checking account."}
                  </p>
                </div>
              </div>

              {/* Form Error Banner */}
              {error && (
                <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive flex items-center gap-2.5 text-xs font-medium">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Recipient Input (Send mode only) */}
              {mode === "send" && (
                <Input
                  id="recipient"
                  label="Recipient Name, Email, or Account ID"
                  placeholder="e.g. Sarah Jenkins (sarah@trustpass.bank)"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  icon={<User className="h-4.5 w-4.5" />}
                  required
                />
              )}

              {/* Amount Input */}
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                label="Amount (₹ INR)"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                icon={<span className="text-sm font-bold text-muted-foreground">₹</span>}
                required
              />

              {/* Category selector (Send mode only) */}
              {mode === "send" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    Transaction Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`p-2 rounded-xl text-xs font-medium border transition-all ${
                          category === cat
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-md"
                            : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Note / Memo */}
              <Input
                id="note"
                label="Payment Note / Reference (Optional)"
                placeholder="e.g. Dinner split, Monthly rent"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              {/* Submit CTA */}
              <div className="pt-2 flex flex-col gap-2">
                <Button type="submit" className="w-full h-12 text-sm font-bold shadow-lg" size="lg">
                  {mode === "send" ? "Authorize & Send Money" : "Confirm Deposit"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-muted-foreground hover:text-foreground py-1 text-center font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}

          {step === "verifying" && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-125 animate-pulse" />
                <div className="relative h-20 w-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <Fingerprint className="h-10 w-10 animate-[pulse_1s_infinite]" />
                </div>
              </div>

              <h4 className="text-xl font-bold text-foreground mb-2">Authorizing Passkey Transfer</h4>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs leading-relaxed">
                Confirming transfer of <span className="font-bold text-foreground">₹{parseFloat(amount || "0").toFixed(2)}</span> to{" "}
                <span className="font-bold text-foreground">{mode === "send" ? recipient : "Checking Account"}</span>
              </p>
              <span className="text-[11px] font-mono text-primary animate-pulse">Hardware Enclave Signing...</span>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-4 text-center"
            >
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <h4 className="text-xl font-bold text-foreground mb-1">Transaction Settled!</h4>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                {mode === "send"
                  ? `Successfully sent ₹${parseFloat(amount || "0").toFixed(2)} to ${recipient}.`
                  : `Successfully deposited ₹${parseFloat(amount || "0").toFixed(2)} into your checking account.`}
              </p>

              <Button onClick={onClose} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Done & Return to Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Dialog>
  )
}
