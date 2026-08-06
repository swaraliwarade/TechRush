"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, Loader2, ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/app/context/AuthContext"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshSession } = useAuth()
  const token = searchParams.get("token")

  const [status, setStatus] = React.useState<"pending" | "verifying" | "success" | "error">(
    token ? "verifying" : "pending"
  )
  const [message, setMessage] = React.useState("")
  const [devOtp, setDevOtp] = React.useState<string | undefined>()

  React.useEffect(() => {
    if (!token) return

    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token!)}`, {
          credentials: "include",
        })
        const data = await res.json()

        if (!res.ok) {
          setStatus("error")
          setMessage(data.error || "Verification failed.")
          return
        }

        setStatus("success")
        setMessage(data.message || "Email verified successfully.")
        setDevOtp(data.devOtp)
        await refreshSession()
      } catch {
        setStatus("error")
        setMessage("Network error during verification.")
      }
    }

    verify()
  }, [token, refreshSession])

  return (
    <Card className="w-full max-w-lg border border-border shadow-2xl relative overflow-hidden bg-card/65 backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-primary to-blue-500" />

      <CardHeader className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
          <Mail className="h-4 w-4" />
          <span>Email Verification</span>
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
          {status === "pending" ? "Check Your Email" : status === "success" ? "Email Verified" : "Verification"}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          {status === "pending"
            ? "We sent a secure verification link to your registered email address."
            : message}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4 py-4">
        {status === "pending" && (
          <>
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Mail className="h-8 w-8" />
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-sm">
              Click the link in your email to continue. After verification, an OTP will be sent to your phone.
            </p>
          </>
        )}

        {status === "verifying" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying your email link…</p>
          </div>
        )}

        {status === "success" && (
          <>
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8" />
            </div>
            {devOtp && (
              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2.5">
                Dev OTP: <span className="font-mono font-bold text-foreground">{devOtp}</span>
              </p>
            )}
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-16 w-16 rounded-full bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <p className="text-sm text-destructive text-center">{message}</p>
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {status === "success" && (
          <Button onClick={() => router.push("/signin/otp")} className="w-full h-12">
            Continue to OTP
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
        {status === "error" && (
          <Button onClick={() => router.push("/signup?mode=signin")} variant="outline" className="w-full h-12">
            Back to Sign In
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4 py-8">
      <React.Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading…
          </div>
        }
      >
        <VerifyEmailContent />
      </React.Suspense>
    </div>
  )
}
