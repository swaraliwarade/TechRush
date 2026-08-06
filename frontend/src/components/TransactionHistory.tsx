"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ArrowUpRight, ArrowDownLeft, ShieldCheck, ShoppingBag, Utensils, Zap, User, PlusCircle, CheckCircle2, ChevronRight, FileText } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"

export interface Transaction {
  id: string
  title: string
  subtitle: string
  amount: number
  type: "in" | "out"
  category: "Transfer" | "Shopping" | "Bills & Utilities" | "Dining & Food" | "Deposit" | "Personal" | "Other"
  date: string
  status: "Completed" | "Pending"
  passkeyVerified: boolean
  accountRef?: string
}

export interface TransactionHistoryProps {
  transactions: Transaction[]
}

const CATEGORY_FILTERS = ["All", "Transfers", "Income/Deposits", "Shopping", "Bills", "Dining"]

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeFilter, setActiveFilter] = React.useState("All")
  const [selectedTx, setSelectedTx] = React.useState<Transaction | null>(null)

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((tx) => {
      // Search match
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        tx.title.toLowerCase().includes(query) ||
        tx.subtitle.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query)

      // Category filter match
      if (activeFilter === "Transfers" && tx.category !== "Transfer") return false
      if (activeFilter === "Income/Deposits" && tx.type !== "in") return false
      if (activeFilter === "Shopping" && tx.category !== "Shopping") return false
      if (activeFilter === "Bills" && tx.category !== "Bills & Utilities") return false
      if (activeFilter === "Dining" && tx.category !== "Dining & Food") return false

      return matchesSearch
    })
  }, [transactions, searchQuery, activeFilter])

  const getCategoryIcon = (category: string, type: "in" | "out") => {
    if (type === "in") return <ArrowDownLeft className="h-4.5 w-4.5 text-emerald-500" />
    switch (category) {
      case "Shopping":
        return <ShoppingBag className="h-4.5 w-4.5 text-indigo-500" />
      case "Dining & Food":
        return <Utensils className="h-4.5 w-4.5 text-amber-500" />
      case "Bills & Utilities":
        return <Zap className="h-4.5 w-4.5 text-rose-500" />
      case "Transfer":
        return <ArrowUpRight className="h-4.5 w-4.5 text-primary" />
      default:
        return <User className="h-4.5 w-4.5 text-primary" />
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val)
  }

  return (
    <div className="w-full flex flex-col gap-6 rounded-3xl border border-border/70 bg-card/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
      {/* Header & Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Transaction Activity Log</h2>
          <p className="text-xs text-muted-foreground">
            Real-time ledger of authorized payments, incoming deposits, and transfers.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72">
          <Input
            id="tx-search"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="h-10 text-xs"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              activeFilter === filter
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {filteredTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl"
            >
              No transactions found matching "{searchQuery}"
            </motion.div>
          ) : (
            filteredTransactions.map((tx, idx) => (
              <motion.button
                key={tx.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                onClick={() => setSelectedTx(tx)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/40 hover:border-primary/40 bg-card hover:bg-muted/30 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getCategoryIcon(tx.category, tx.type)}
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {tx.title}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{tx.date}</span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="truncate">{tx.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className={`text-sm font-bold font-mono ${
                        tx.type === "in"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {tx.type === "in" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                    {tx.passkeyVerified && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <ShieldCheck className="h-3 w-3" />
                        Passkey Verified
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform hidden sm:block" />
                </div>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Transaction Detail Drawer / Dialog */}
      <Dialog isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} className="sm:max-w-md">
        {selectedTx && (
          <div className="p-6 flex flex-col gap-5 text-left">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  {getCategoryIcon(selectedTx.category, selectedTx.type)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedTx.title}</h3>
                  <p className="text-xs text-muted-foreground">{selectedTx.date}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-center flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount</span>
              <span
                className={`text-3xl font-black font-mono ${
                  selectedTx.type === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                }`}
              >
                {selectedTx.type === "in" ? "+" : "-"}{formatCurrency(selectedTx.amount)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                <span className="text-muted-foreground">Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {selectedTx.status}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold text-foreground">{selectedTx.category}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                <span className="text-muted-foreground">Security Protocol</span>
                <span className="font-semibold text-primary flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  FIDO2 Biometric Signature
                </span>
              </div>
              {selectedTx.subtitle && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                  <span className="text-muted-foreground">Reference Note</span>
                  <span className="font-semibold text-foreground">{selectedTx.subtitle}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
