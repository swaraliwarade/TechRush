import { NextResponse } from "next/server"
import { isExpired, verifySecret } from "@/lib/auth/crypto"
import {
  getAuthSession,
  getLatestChallengeForSession,
  markChallengeUsed,
  updateAuthSession,
  updateChallengeData,
} from "@/lib/auth/store"
import { createSessionCookie, getSessionIdFromCookie } from "@/lib/auth/session"

const MAX_OTP_ATTEMPTS = 5

export async function POST(request: Request) {
  try {
    const sessionId = await getSessionIdFromCookie()
    if (!sessionId) {
      return NextResponse.json({ error: "No active session. Please sign in again." }, { status: 401 })
    }

    const session = await getAuthSession(sessionId)
    if (!session || isExpired(session.expires_at)) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 })
    }

    if (!session.email_verified) {
      return NextResponse.json({ error: "Email verification required first." }, { status: 403 })
    }

    if (session.phone_verified) {
      return NextResponse.json({ success: true, nextStep: "biometric", message: "OTP already verified." })
    }

    const body = await request.json()
    const otp = String(body.otp ?? "").trim()

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "Please enter a valid 6-digit OTP." }, { status: 400 })
    }

    const challenge = await getLatestChallengeForSession(sessionId, "otp")
    if (!challenge || !challenge.token_hash || isExpired(challenge.expires_at)) {
      return NextResponse.json({ error: "OTP expired. Please sign in again." }, { status: 400 })
    }

    const attempts = Number(challenge.challenge_data?.attempts ?? 0)
    if (attempts >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json({ error: "Too many OTP attempts. Please sign in again." }, { status: 429 })
    }

    await updateChallengeData(challenge.id, { attempts: attempts + 1 })

    const match = await verifySecret(otp, challenge.token_hash)
    if (!match) {
      return NextResponse.json({ error: "Invalid OTP. Please try again." }, { status: 401 })
    }

    await markChallengeUsed(challenge.id)
    const updatedSession = await updateAuthSession(sessionId, { phone_verified: true })
    if (!updatedSession) {
      return NextResponse.json({ error: "Failed to update session." }, { status: 500 })
    }

    await createSessionCookie(sessionId, updatedSession.expires_at)

    return NextResponse.json({
      success: true,
      message: "Phone verified successfully.",
      nextStep: "biometric",
    })
  } catch (err) {
    console.error("OTP verification error:", err)
    return NextResponse.json({ error: "Internal server error occurred." }, { status: 500 })
  }
}
