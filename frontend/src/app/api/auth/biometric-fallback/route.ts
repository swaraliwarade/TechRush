import { NextResponse } from "next/server"
import { isExpired } from "@/lib/auth/crypto"
import { getAuthSession, updateAuthSession } from "@/lib/auth/store"
import { createSessionCookie, getSessionIdFromCookie } from "@/lib/auth/session"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const sessionId = await getSessionIdFromCookie()
    if (!sessionId) {
      return NextResponse.json({ error: "No active session." }, { status: 401 })
    }

    const session = await getAuthSession(sessionId)
    if (!session || isExpired(session.expires_at)) {
      return NextResponse.json({ error: "Session expired." }, { status: 401 })
    }

    if (!session.email_verified || !session.phone_verified) {
      return NextResponse.json({ error: "Complete prior verification steps first." }, { status: 403 })
    }

    const body = await request.json()
    const pin = String(body.pin ?? "").trim()

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Enter a valid 6-digit security PIN." }, { status: 400 })
    }

    const expectedPin = process.env.BIOMETRIC_FALLBACK_PIN || "847291"
    const pinHash = crypto.createHash("sha256").update(pin).digest("hex")
    const expectedHash = crypto.createHash("sha256").update(expectedPin).digest("hex")

    if (pinHash !== expectedHash) {
      return NextResponse.json({ error: "Incorrect security PIN." }, { status: 401 })
    }

    const updatedSession = await updateAuthSession(sessionId, { biometric_verified: true })
    if (!updatedSession) {
      return NextResponse.json({ error: "Failed to update session." }, { status: 500 })
    }

    await createSessionCookie(sessionId, updatedSession.expires_at)

    return NextResponse.json({
      success: true,
      nextStep: "dashboard",
      fallback: true,
      message: "Security PIN verified. Dashboard access granted.",
    })
  } catch (err) {
    console.error("Biometric fallback error:", err)
    return NextResponse.json({ error: "Verification failed." }, { status: 500 })
  }
}
