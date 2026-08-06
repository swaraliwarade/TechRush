import { NextResponse } from "next/server"
import type { RegistrationResponseJSON } from "@simplewebauthn/server"
import { isExpired } from "@/lib/auth/crypto"
import {
  getAuthSession,
  getLatestChallengeForSession,
  getWebAuthnCredentialsForAccount,
  markChallengeUsed,
  saveWebAuthnCredential,
  updateAuthSession,
} from "@/lib/auth/store"
import { verifyRegistration } from "@/lib/webauthn/server"
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

    const challenge = await getLatestChallengeForSession(sessionId, "webauthn_register")
    if (!challenge || isExpired(challenge.expires_at)) {
      return NextResponse.json({ error: "Registration challenge expired." }, { status: 400 })
    }

    const expectedChallenge = challenge.challenge_data?.challenge as string | undefined
    if (!expectedChallenge) {
      return NextResponse.json({ error: "Invalid challenge state." }, { status: 400 })
    }

    const body = await request.json()
    const response = body.response as RegistrationResponseJSON
    if (!response) {
      return NextResponse.json({ error: "Missing registration response." }, { status: 400 })
    }

    const verification = await verifyRegistration(response, expectedChallenge)
    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Biometric registration failed." }, { status: 401 })
    }

    const { credential, credentialDeviceType } = verification.registrationInfo

    await saveWebAuthnCredential({
      account_id: session.account_id,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      device_type: credentialDeviceType === "multiDevice" ? "commercial" : "retail",
      transports: response.response.transports ?? null,
    })

    await markChallengeUsed(challenge.id)
    const updatedSession = await updateAuthSession(sessionId, { biometric_verified: true })
    if (!updatedSession) {
      return NextResponse.json({ error: "Failed to update session." }, { status: 500 })
    }

    await createSessionCookie(sessionId, updatedSession.expires_at)

    return NextResponse.json({ success: true, nextStep: "dashboard" })
  } catch (err) {
    console.error("WebAuthn register verify error:", err)
    return NextResponse.json({ error: "Biometric registration failed." }, { status: 500 })
  }
}
