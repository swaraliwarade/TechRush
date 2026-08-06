"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Fingerprint, CheckCircle2, ShieldAlert, KeyRound, Cpu, ArrowRight } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export interface PasskeyModalProps {
  isOpen: boolean
  onClose: () => void
  customerName: string
}

type RegistrationState = "idle" | "verifying" | "success"

export function PasskeyModal({ isOpen, onClose, customerName }: PasskeyModalProps) {
  const router = useRouter()
  const [state, setState] = React.useState<RegistrationState>("idle")
  const [pinInput, setPinInput] = React.useState("")
  const [pinError, setPinError] = React.useState("")

  React.useEffect(() => {
    if (isOpen) {
      setState("idle")
      setPinInput("")
      setPinError("")
    }
  }, [isOpen])

  const handleStartRegistration = () => {
    setState("verifying")
    // Auto-advance simulated biometric verification after 2.5 seconds
    setTimeout(() => {
      setState("success")
    }, 2500)
  }

  // Draw checkmark animation path
  const checkmarkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: "spring" as const, stiffness: 100, damping: 15 },
        opacity: { duration: 0.2 },
      },
    },
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="sm:max-w-md">
      <div className="relative p-6 sm:p-8 flex flex-col items-center text-center">
        
        {/* Main Content States */}
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center"
            >
              {/* Premium Icon Badge */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-125 animate-pulse" />
                <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl border border-primary/20 bg-primary/5 text-primary">
                  <Fingerprint className="h-9 w-9 animate-pulse" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                Register Your Passkey
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Welcome, <span className="font-semibold text-foreground">{customerName}</span>. 
                Activate passwordless login on this device using Touch ID, Face ID, or Windows Hello. 
                Passkeys protect your banking account against phishing and never leave your device.
              </p>

              {/* Security benefits grid */}
              <div className="grid grid-cols-2 gap-3 w-full text-left mb-8">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex flex-col gap-1.5">
                  <KeyRound className="h-4.5 w-4.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">No Passwords</span>
                  <span className="text-[10px] text-muted-foreground">Immune to credentials theft</span>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex flex-col gap-1.5">
                  <Cpu className="h-4.5 w-4.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Secure Chip</span>
                  <span className="text-[10px] text-muted-foreground">Stored on hardware enclave</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <Button onClick={handleStartRegistration} className="w-full h-11" size="lg">
                  Create Passkey
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={onClose}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold py-2 transition-colors cursor-pointer"
                >
                  Configure security settings later
                </button>
              </div>
            </motion.div>
          )}

          {state === "verifying" && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-6 w-full"
            >
              {/* Simulated Biometric Screen System Prompt Mock */}
              <div className="w-full max-w-xs bg-card border border-border rounded-2xl shadow-xl p-6 text-left relative overflow-hidden backdrop-blur-xl">
                {/* Subtle blue accent glow inside mock OS dialog */}
                <div className="absolute -top-12 -left-12 h-24 w-24 rounded-full bg-primary/10 blur-xl" />
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Security Verification</h4>
                    <p className="text-[10px] text-muted-foreground">trustpass.bank</p>
                  </div>
                </div>

                <p className="text-xs text-foreground mb-6 leading-normal">
                  TrustPass is requesting verification. Touch your fingerprint sensor or authenticate on your device.
                </p>

                {/* Animated Fingerprint Sensor Radar */}
                <div className="flex justify-center mb-6 relative">
                  {/* Expanding radar rings */}
                  <div className="absolute inset-0 m-auto h-16 w-16 rounded-full border border-primary/20 scale-100 animate-[ping_1.5s_infinite]" />
                  <div className="absolute inset-0 m-auto h-20 w-20 rounded-full border border-primary/10 scale-100 animate-[ping_2s_infinite]" />
                  
                  <div className="relative h-16 w-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                    <Fingerprint className="h-8 w-8 animate-[pulse_1s_infinite]" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-xs">
                  <Button variant="outline" size="sm" onClick={() => setState("idle")} className="h-8 px-3">
                    Cancel
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-8 animate-pulse">
                Accessing hardware security enclave...
              </p>
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              {/* Checkmark Drawing SVG */}
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-lg" />
                <svg
                  className="h-8 w-8 stroke-current"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M20 6L9 17L4 12"
                    variants={checkmarkVariants}
                    initial="hidden"
                    animate="visible"
                  />
                </svg>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                Security Passkey Set!
              </h2>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-sm">
                Your device has registered a passkey. You can now access your TrustPass bank account securely using biometrics. No passwords required.
              </p>

              <Button onClick={() => router.push("/dashboard")} variant="default" className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
                Continue to Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Dialog>
  )
}
