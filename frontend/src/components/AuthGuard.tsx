"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldAlert } from "lucide-react"
import { useAuth, getRedirectForStep } from "@/app/context/AuthContext"
import type { SessionStatus } from "@/lib/auth/types"

interface AuthGuardProps {
  children: React.ReactNode
  requireStep?: SessionStatus["nextStep"]
  allowSteps?: SessionStatus["nextStep"][]
}

export function AuthGuard({ children, requireStep, allowSteps }: AuthGuardProps) {
  const router = useRouter()
  const { loading, session, refreshSession } = useAuth()
  const [checking, setChecking] = React.useState(true)

  React.useEffect(() => {
    let active = true

    async function check() {
      const current = session ?? (await refreshSession())
      if (!active) return

      if (!current) {
        router.replace("/signup?mode=signin")
        return
      }

      if (requireStep && current.nextStep !== requireStep) {
        router.replace(getRedirectForStep(current.nextStep))
        return
      }

      if (allowSteps && !allowSteps.includes(current.nextStep)) {
        router.replace(getRedirectForStep(current.nextStep))
        return
      }

      setChecking(false)
    }

    if (!loading) {
      check()
    }

    return () => {
      active = false
    }
  }, [loading, session, refreshSession, router, requireStep, allowSteps])

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Verifying session…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 text-destructive text-sm">
          <ShieldAlert className="h-5 w-5" />
          Session invalid. Redirecting…
        </div>
      </div>
    )
  }

  return <>{children}</>
}
