"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  Shield,
  Sparkles,
  Lock,
  Plus,
  Send,
} from "lucide-react"
import Link from "next/link"

import { AuthGuard } from "@/components/AuthGuard"
import { useAuth } from "@/app/context/AuthContext"

type BankId = "retail" | "commercial"

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_1",
    title: "Stripe Monthly Payout",
    subtitle: "Merchant Settlement ID #84920",
    amount: 34500.0,
    type: "in",
    category: "Deposit",
    date: "Today, 10:45 AM",
    status: "Completed",
    passkeyVerified: true,
  },
  {
    id: "tx_2",
    title: "Apple Store Online",
    subtitle: "MacBook Accessory Purchase",
    amount: 14900.0,
    type: "out",
    category: "Shopping",
    date: "Yesterday, 3:20 PM",
    status: "Completed",
    passkeyVerified: true,
  },
  {
    id: "tx_3",
    title: "Transfer to Savings",
    subtitle: "High-yield automated deposit",
    amount: 5000.0,
    type: "out",
    category: "Transfer",
    date: "Aug 2, 2026",
    status: "Completed",
    passkeyVerified: true,
  },
  {
    id: "tx_4",
    title: "Blue Tokai Coffee",
    subtitle: "Mumbai MH",
    amount: 450.0,
    type: "out",
    category: "Dining & Food",
    date: "Aug 1, 2026",
    status: "Completed",
    passkeyVerified: false,
  },
  {
    id: "tx_5",
    title: "AWS Cloud Web Services",
    subtitle: "Monthly Server Hosting",
    amount: 2840.0,
    type: "out",
    category: "Bills & Utilities",
    date: "Jul 28, 2026",
    status: "Completed",
    passkeyVerified: true,
  },
]

export default function DashboardPage() {
  return (
    <AuthGuard requireStep="dashboard">
      <DashboardContent />
    </AuthGuard>
  )
}

function DashboardContent() {
  const { session } = useAuth()
  const [customerName, setCustomerName] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string>("TP-849102")
  const [email, setEmail] = React.useState<string>("customer@trustpass.bank")
  const [phone, setPhone] = React.useState<string | undefined>(undefined)
  const [selectedBank, setSelectedBank] = React.useState<BankId>("retail")

  // Account State
  const [checkingBalance, setCheckingBalance] = React.useState(143505.0)
  const [savingsBalance, setSavingsBalance] = React.useState(105000.0)
  const [cashbackBalance, setCashbackBalance] = React.useState(4205.0)
  const [pointsBalance, setPointsBalance] = React.useState(34250)
  const [transactions, setTransactions] = React.useState<Transaction[]>(INITIAL_TRANSACTIONS)

  // Modals state
  const [isDeviceHistoryOpen, setIsDeviceHistoryOpen] = React.useState(false)
  const [isTxModalOpen, setIsTxModalOpen] = React.useState(false)
  const [txModalMode, setTxModalMode] = React.useState<"send" | "deposit">("send")

  React.useEffect(() => {
<<<<<<< Updated upstream
    const storedName = sessionStorage.getItem("trustpass_customer_name")
    const storedId = sessionStorage.getItem("trustpass_customer_id") || sessionStorage.getItem("trustpass_account_id")
    const storedEmail = sessionStorage.getItem("trustpass_customer_email")
    const storedPhone = sessionStorage.getItem("trustpass_customer_phone")
    const storedBank = sessionStorage.getItem("trustpass_selected_bank") as BankId | null

    if (storedName) setCustomerName(storedName)
    if (storedId) setCustomerId(storedId)
    if (storedEmail) setEmail(storedEmail)
    if (storedPhone) setPhone(storedPhone)
    if (storedBank) setSelectedBank(storedBank)
  }, [])
=======
    if (session?.account?.full_name) {
      setCustomerName(session.account.full_name)
      sessionStorage.setItem("trustpass_customer_name", session.account.full_name)
      sessionStorage.setItem("trustpass_account_id", session.account.id)
      sessionStorage.setItem("trustpass_customer_email", session.account.email)
      sessionStorage.setItem("trustpass_customer_id", session.account.customer_id)
      if (session.account.phone_number) {
        sessionStorage.setItem("trustpass_customer_phone", session.account.phone_number)
      }
    } else {
      const storedName = sessionStorage.getItem("trustpass_customer_name")
      if (storedName) setCustomerName(storedName)
    }
  }, [session])
>>>>>>> Stashed changes

  const totalBalance = checkingBalance + savingsBalance

  const handleTransactionSuccess = (tx: {
    recipient: string
    amount: number
    type: "out" | "in"
    category: string
    note: string
  }) => {
    if (tx.type === "out") {
      setCheckingBalance((prev) => prev - tx.amount)
      setPointsBalance((prev) => prev + Math.floor(tx.amount * 2))
    } else {
      setCheckingBalance((prev) => prev + tx.amount)
    }

    const newTransaction: Transaction = {
      id: `tx_${Date.now()}`,
      title: tx.recipient,
      subtitle: tx.note || (tx.type === "out" ? "Instant Passkey Transfer" : "Direct Account Deposit"),
      amount: tx.amount,
      type: tx.type,
      category: tx.category as any,
      date: "Just now",
      status: "Completed",
      passkeyVerified: true,
    }

    setTransactions((prev) => [newTransaction, ...prev])
  }

  const handleRedeemCashback = (amount: number) => {
    if (cashbackBalance >= amount) {
      setCashbackBalance((prev) => prev - amount)
      setCheckingBalance((prev) => prev + amount)

      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        title: "Cashback Reward Redemption",
        subtitle: "Transferred from TrustPass Rewards",
        amount: amount,
        type: "in",
        category: "Deposit",
        date: "Just now",
        status: "Completed",
        passkeyVerified: true,
      }
      setTransactions((prev) => [newTx, ...prev])
    }
  }

  return (
    <div className="min-h-screen w-full relative bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[-5%] h-[500px] w-[500px] rounded-full bg-primary/[0.06] blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-violet-500/[0.04] blur-[150px]" />
        <svg
          className="absolute inset-0 h-full w-full stroke-primary/[0.025]"
          aria-hidden="true"
        >
          <defs>
            <pattern id="dash-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M.5 40V.5H40" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" strokeWidth="0" fill="url(#dash-grid)" />
        </svg>
      </div>

      {/* Clean Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-border/40">
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
            <Shield className="h-5.5 w-5.5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Trust<span className="text-primary font-black">Pass</span>
          </span>
        </Link>

        {/* Top-Right Security Status & Account Header Menu */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1.5 bg-emerald-500/10">
            <Lock className="h-3.5 w-3.5" />
            <span>Passkey Vault Active</span>
          </div>

          <AccountHeaderMenu
            customerName={customerName || "Valued Customer"}
            customerId={customerId}
            email={email}
            phone={phone}
            onOpenDeviceHistory={() => setIsDeviceHistoryOpen(true)}
          />
        </div>
      </header>

      {/* Main Content View (Account Dashboard) */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-8 lg:py-10 space-y-10">
        {/* Welcome Greeting Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-primary bg-primary/[0.06] border border-primary/10 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {selectedBank === "retail" ? "TrustPass Retail Banking Account" : "TrustPass Wealth & Commercial Account"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Welcome back,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">
                {customerName ? customerName.split(" ")[0] : "Customer"}
              </span>
            </h1>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTxModalMode("send")
                setIsTxModalOpen(true)
              }}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/95 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Send Money
            </button>

            <button
              type="button"
              onClick={() => {
                setTxModalMode("deposit")
                setIsTxModalOpen(true)
              }}
              className="px-4 py-2 rounded-xl bg-muted/80 hover:bg-muted text-foreground text-xs font-bold border border-border/60 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              Deposit
            </button>
          </div>
        </div>

        {/* Account Overview (Balances, Transactions, Activity & Rewards) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-10"
        >
          {/* 1. Account Balances Card */}
          <BalanceCard
            totalBalance={totalBalance}
            checkingBalance={checkingBalance}
            savingsBalance={savingsBalance}
            onOpenSendModal={() => {
              setTxModalMode("send")
              setIsTxModalOpen(true)
            }}
            onOpenDepositModal={() => {
              setTxModalMode("deposit")
              setIsTxModalOpen(true)
            }}
          />

          {/* 2. Transaction Activity Log */}
          <TransactionHistory transactions={transactions} />

          {/* 3. Rewards & Perks Program */}
          <RewardsSection
            cashbackBalance={cashbackBalance}
            pointsBalance={pointsBalance}
            onRedeemCashback={handleRedeemCashback}
          />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-border/40 text-center">
        <span className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} TrustPass Bank Inc. · Passwordless Biometric Banking · Member FDIC
        </span>
      </footer>

      {/* Interactive Modals */}
      <DeviceHistoryModal
        isOpen={isDeviceHistoryOpen}
        onClose={() => setIsDeviceHistoryOpen(false)}
        customerName={customerName || "Valued Customer"}
        customerId={customerId}
        email={email}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        mode={txModalMode}
        currentCheckingBalance={checkingBalance}
        onTransactionSuccess={handleTransactionSuccess}
      />
    </div>
  )
}
