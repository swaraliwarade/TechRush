"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Award, Gift, Sparkles, Zap, ArrowRight, CheckCircle2, Percent, Plane, Smartphone } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface RewardsSectionProps {
  cashbackBalance: number
  pointsBalance: number
  onRedeemCashback: (amount: number) => void
}

const PERKS = [
  {
    id: "perk_1",
    title: "5% Cashback on Tech & Cloud",
    description: "Earn 5% rewards back on all software, hardware, and developer subscriptions.",
    icon: <Smartphone className="h-5 w-5 text-indigo-500" />,
    badge: "Active",
  },
  {
    id: "perk_2",
    title: "2% Travel & Airport Rebates",
    description: "Unlimited 2% back on flight bookings, hotels, and international rides.",
    icon: <Plane className="h-5 w-5 text-blue-500" />,
    badge: "Active",
  },
  {
    id: "perk_3",
    title: "Free Airport Lounge Pass",
    description: "Complimentary access to 1,200+ VIP airport lounges worldwide.",
    icon: <Sparkles className="h-5 w-5 text-amber-500" />,
    badge: "Gold Perk",
  },
]

export function RewardsSection({
  cashbackBalance,
  pointsBalance,
  onRedeemCashback,
}: RewardsSectionProps) {
  const [redeemed, setRedeemed] = React.useState(false)

  const handleRedeem = () => {
    if (cashbackBalance >= 500) {
      onRedeemCashback(500)
      setRedeemed(true)
      setTimeout(() => setRedeemed(false), 3000)
    }
  }

  return (
    <div className="w-full flex flex-col gap-6 rounded-3xl border border-border/70 bg-card/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">TrustPass Rewards & Perks</h2>
            <p className="text-xs text-muted-foreground">
              Cashback bonuses, exclusive tier benefits, and instant point redemptions.
            </p>
          </div>
        </div>

        {/* Current Tier Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0">
          <Sparkles className="h-4 w-4" />
          <span>Gold Fintech Member</span>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CashBack Balance Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/60 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground uppercase tracking-wider">Available Cashback</span>
            <Gift className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <span className="text-3xl font-black text-foreground font-mono">
              ₹{cashbackBalance.toFixed(2)}
            </span>
            <p className="text-[11px] text-muted-foreground mt-1">Ready to redeem directly to Checking</p>
          </div>
          <Button
            onClick={handleRedeem}
            disabled={cashbackBalance < 500 || redeemed}
            className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {redeemed ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> ₹500 Redeemed to Checking!
              </span>
            ) : (
              "Redeem ₹500 to Checking"
            )}
          </Button>
        </div>

        {/* TrustPoints Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/60 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground uppercase tracking-wider">TrustPoints Balance</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <span className="text-3xl font-black text-foreground font-mono">
              {pointsBalance.toLocaleString()} pts
            </span>
            <p className="text-[11px] text-muted-foreground mt-1">Earned on every passkey transaction</p>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/50">
            <div className="bg-amber-500 h-full w-[78%]" />
          </div>
        </div>

        {/* Tier Status Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/[0.05] to-primary/[0.01] border border-primary/20 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-primary uppercase tracking-wider">Tier Milestone</span>
            <Percent className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">7,950 pts to Platinum</span>
            <p className="text-[11px] text-muted-foreground mt-1">Unlocks 0% international transaction fees.</p>
          </div>
          <div className="text-[11px] font-semibold text-primary flex items-center gap-1">
            <span>Learn more about tier benefits</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Active Perks List */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-foreground">Active Partner Discounts & Perks</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PERKS.map((perk) => (
            <div
              key={perk.id}
              className="p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all flex flex-col gap-3 justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                  {perk.icon}
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {perk.badge}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">{perk.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{perk.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
