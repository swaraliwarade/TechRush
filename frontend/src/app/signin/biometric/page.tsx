"use client"

import { AuthGuard } from "@/components/AuthGuard"
import { BiometricVerification } from "@/components/BiometricVerification"
import { useAuth } from "@/app/context/AuthContext"

function BiometricPageContent() {
  const { session } = useAuth()
  const name = session?.account?.full_name ?? "Customer"

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4 py-8">
      <BiometricVerification customerName={name} />
    </div>
  )
}

export default function BiometricPage() {
  return (
    <AuthGuard requireStep="biometric">
      <BiometricPageContent />
    </AuthGuard>
  )
}
