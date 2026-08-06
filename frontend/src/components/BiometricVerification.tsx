"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Fingerprint,
  ShieldAlert,
  KeyRound,
  Cpu,
  ArrowRight,
  Smartphone,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  authenticatePasskey,
  isBrowserWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
} from "@/lib/webauthn/client"
import { useAuth } from "@/app/context/AuthContext"

type BiometricState = "idle" | "verifying" | "success" | "error" | "fallback"

interface BiometricVerificationProps {
  customerName: string
}

export function BiometricVerification({ customerName }: BiometricVerificationProps) {
  const router = useRouter()
  const { refreshSession } = useAuth()
  const [state, setState] = React.useState<BiometricState>("idle")
  const [error, setError] = React.useState("")
  const [hasExistingCredentials, setHasExistingCredentials] = React.useState(false)
  const [webAuthnAvailable, setWebAuthnAvailable] = React.useState<boolean | null>(null)
  const [pinInput, setPinInput] = React.useState("")
  const [pinError, setPinError] = React.useState("")
  const [isSubmittingPin, setIsSubmittingPin] = React.useState(false)

  React.useEffect(() => {
    async function detect() {
      const supported = isBrowserWebAuthnSupported()
      if (!supported) {
        setWebAuthnAvailable(false)
        return
      }
      const platform = await isPlatformAuthenticatorAvailable()
      setWebAuthnAvailable(platform)
    }
    detect()
  }, [])

  React.useEffect(() => {
    async function checkCredentials() {
      try {
        const res = await fetch("/api/webauthn/register/options", {
          method: "POST",
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          setHasExistingCredentials(!!data.hasExistingCredentials)
        }
      } catch {
        // Options probe is best-effort
      }
    }
    checkCredentials()
  }, [])

  const handleSuccess = React.useCallback(async () => {
    setState("success")
    await refreshSession()
    setTimeout(() => router.push("/dashboard"), 1200)
  }, [refreshSession, router])

  const runWebAuthnCeremony = async () => {
    setState("verifying")
    setError("")

    try {
      if (hasExistingCredentials) {
        const optionsRes = await fetch("/api/webauthn/login/options", {
          method: "POST",
          credentials: "include",
        })
        const optionsData = await optionsRes.json()
        if (!optionsRes.ok) throw new Error(optionsData.error || "Failed to start authentication")

        const authResponse = await authenticatePasskey(optionsData.options)
        const verifyRes = await fetch("/api/webauthn/login/verify", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: authResponse }),
        })
        const verifyData = await verifyRes.json()
        if (!verifyRes.ok) throw new Error(verifyData.error || "Biometric verification failed")
      } else {
        const optionsRes = await fetch("/api/webauthn/register/options", {
          method: "POST",
          credentials: "include",
        })
        const optionsData = await optionsRes.json()
        if (!optionsRes.ok) throw new Error(optionsData.error || "Failed to start registration")

        const regResponse = await registerPasskey(optionsData.options)
        const verifyRes = await fetch("/api/webauthn/register/verify", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: regResponse }),
        })
        const verifyData = await verifyRes.json()
        if (!verifyRes.ok) throw new Error(verifyData.error || "Biometric registration failed")
      }

      await handleSuccess()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Biometric verification failed. Please try again."
      setError(message)
      setState("error")
    }
  }

  const handleFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError("")
    setIsSubmittingPin(true)

    try {
      const res = await fetch("/api/auth/biometric-fallback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPinError(data.error || "Verification failed.")
        setIsSubmittingPin(false)
        return
      }
      await handleSuccess()
    } catch {
      setPinError("Network error. Please try again.")
      setIsSubmittingPin(false)
    }
  }

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

  const showFallback = webAuthnAvailable === false

  return (
    <Card className="w-full max-w-lg border border-border shadow-2xl relative overflow-hidden bg-card/65 backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-primary to-blue-500" />

      <CardHeader className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
          <Fingerprint className="h-4 w-4" />
          <span>Final Security Layer</span>
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
          Biometric Verification
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Welcome back, <span className="font-semibold text-foreground">{customerName}</span>.
          Confirm your identity with Face ID, Touch ID, or your device passkey.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {(state === "idle" || state === "error") && !showFallback && state !== "fallback" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-125 animate-pulse" />
                <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl border border-primary/20 bg-primary/5 text-primary">
                  <Fingerprint className="h-9 w-9 animate-pulse" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full text-left mb-6">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex flex-col gap-1.5">
                  <KeyRound className="h-4.5 w-4.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">No Passwords</span>
                  <span className="text-[10px] text-muted-foreground">Immune to credential theft</span>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex flex-col gap-1.5">
                  <Cpu className="h-4.5 w-4.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Secure Chip</span>
                  <span className="text-[10px] text-muted-foreground">Stored on hardware enclave</span>
                </div>
              </div>

              {state === "error" && error && (
                <div className="w-full p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive flex gap-2.5 text-left mb-4">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold">Verification Failed</span>
                    <span className="text-[11px] font-medium leading-normal">{error}</span>
                  </div>
                </div>
              )}

              <Button onClick={runWebAuthnCeremony} className="w-full h-11" size="lg">
                {hasExistingCredentials ? "Verify with Biometrics" : "Register Passkey"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <button
                type="button"
                onClick={() => setState("fallback")}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold py-3 transition-colors cursor-pointer"
              >
                Use security PIN instead
              </button>
            </motion.div>
          )}

          {state === "verifying" && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-4 w-full"
            >
              <div className="w-full max-w-xs bg-card border border-border rounded-2xl shadow-xl p-6 text-left relative overflow-hidden backdrop-blur-xl">
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

                <div className="flex justify-center mb-6 relative">
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
                Accessing hardware security enclave…
              </p>
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-4"
            >
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
              <h3 className="text-xl font-bold text-foreground mb-2">Identity Verified</h3>
              <p className="text-sm text-muted-foreground text-center">
                Redirecting to your secure dashboard…
              </p>
            </motion.div>
          )}

          {(state === "fallback" || showFallback) && state !== "success" && state !== "verifying" && (
            <motion.div
              key="fallback"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] flex gap-3 text-left">
                <Smartphone className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">Secure Fallback</span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    WebAuthn is unavailable on this device. Enter your 6-digit security PIN to continue.
                    {process.env.NODE_ENV === "development" && " Demo PIN: 847291"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleFallbackSubmit} className="space-y-4">
                <Input
                  id="securityPin"
                  name="securityPin"
                  type="password"
                  inputMode="numeric"
                  label="Security PIN"
                  placeholder="••••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  error={pinError}
                  maxLength={6}
                />
                <Button type="submit" className="w-full h-11" isLoading={isSubmittingPin}>
                  Verify PIN
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              {webAuthnAvailable && (
                <button
                  type="button"
                  onClick={() => setState("idle")}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold py-2 transition-colors cursor-pointer text-center"
                >
                  Try biometric verification instead
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <CardFooter className="justify-center pb-6">
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed max-w-sm">
          Biometric data never leaves your device. TrustPass stores only passkey public key references.
        </p>
      </CardFooter>
    </Card>
  )
}
