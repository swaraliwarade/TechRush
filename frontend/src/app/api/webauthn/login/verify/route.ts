import { NextResponse } from "next/server"
import type { AuthenticationResponseJSON } from "@simplewebauthn/server"
import { isExpired } from "@/lib/auth/crypto"
import {
  getAuthSession,
  getLatestChallengeForSession,
  getWebAuthnCredentialById,
  markChallengeUsed,
  updateAuthSession,
  updateWebAuthnCounter,
} from "@/lib/auth/store"
import { verifyAuthentication } from "@/lib/webauthn/server"
import { createSessionCookie, getSessionIdFromCookie } from "@/lib/auth/session"

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

    const challenge = await getLatestChallengeForSession(sessionId, "webauthn_login")
    if (!challenge || isExpired(challenge.expires_at)) {
      return NextResponse.json({ error: "Authentication challenge expired." }, { status: 400 })
    }

    const expectedChallenge = challenge.challenge_data?.challenge as string | undefined
    if (!expectedChallenge) {
      return NextResponse.json({ error: "Invalid challenge state." }, { status: 400 })
    }

    const body = await request.json()
    const response = body.response as AuthenticationResponseJSON
    if (!response) {
      return NextResponse.json({ error: "Missing authentication response." }, { status: 401 })
    }

    const credential = await getWebAuthnCredentialById(response.id)
    if (!credential || credential.account_id !== session.account_id) {
      return NextResponse.json({ error: "Unknown passkey credential." }, { status: 401 })
    }

    const verification = await verifyAuthentication(response, expectedChallenge, credential)
    if (!verification.verified) {
      return NextResponse.json({ error: "Biometric verification failed." }, { status: 401 })
    }

    if (verification.authenticationInfo.newCounter <= credential.counter) {
      return NextResponse.json({ error: "Possible replay attack detected." }, { status: 401 })
    }

    await updateWebAuthnCounter(credential.credential_id, verification.authenticationInfo.newCounter)
    await markChallengeUsed(challenge.id)

    const updatedSession = await updateAuthSession(sessionId, { biometric_verified: true })
    if (!updatedSession) {
      return NextResponse.json({ error: "Failed to update session." }, { status: 500 })
    }

    await createSessionCookie(sessionId, updatedSession.expires_at)

    return NextResponse.json({ success: true, nextStep: "dashboard" })
  } catch (err) {
    console.error("WebAuthn login verify error:", err)
    return NextResponse.json({ error: "Biometric verification failed." }, { status: 500 })
  }
}
