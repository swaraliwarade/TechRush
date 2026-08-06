"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Smartphone, ArrowRight, ShieldAlert, RefreshCw } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/AuthGuard"
import { useAuth } from "@/app/context/AuthContext"

export function OtpVerificationForm() {
  const router = useRouter()
  const { session, refreshSession } = useAuth()
  const [otp, setOtp] = React.useState("")
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [maskedPhone, setMaskedPhone] = React.useState("your registered phone")

  React.useEffect(() => {
    if (session?.account?.phone_number) {
      const phone = session.account.phone_number
      setMaskedPhone(phone.replace(/(\+\d{1,3})?(\d{2,3})\d+(\d{2})/, "$1$2•••••$3"))
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "OTP verification failed.")
        setIsLoading(false)
        return
      }

      await refreshSession()
      router.push("/signin/biometric")
    } catch {
      setError("Network connection failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-lg border border-border shadow-2xl relative overflow-hidden bg-card/65 backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-primary to-blue-500" />

      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
          <Smartphone className="h-4 w-4" />
          <span>Phone Verification</span>
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
          Enter OTP Code
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          We sent a 6-digit code to {maskedPhone}. The code expires in 5 minutes.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-5">
          <Input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            label="One-Time Password"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            required
            autoComplete="one-time-code"
          />

          {process.env.NODE_ENV === "development" && (
            <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2.5">
              Dev tip: check the server console for the OTP code.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {error && (
            <div className="w-full p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive flex gap-2.5 text-left">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold">Verification Failed</span>
                <span className="text-[11px] font-medium leading-normal">{error}</span>
              </div>
            </div>
          )}
          <Button type="submit" className="w-full h-12 text-base font-semibold shadow-md" isLoading={isLoading}>
            Verify OTP
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <button
            type="button"
            onClick={() => router.push("/signup?mode=signin")}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold py-2 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Start over
          </button>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function OtpPage() {
  return (
    <AuthGuard requireStep="otp">
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4 py-8">
        <OtpVerificationForm />
      </div>
    </AuthGuard>
  )
}
