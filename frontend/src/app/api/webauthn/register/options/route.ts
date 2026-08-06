import { NextResponse } from "next/server"
import { challengeExpiryIso, isExpired } from "@/lib/auth/crypto"
import {
  createAuthChallenge,
  findAccountById,
  getAuthSession,
  getLatestChallengeForSession,
  getWebAuthnCredentialsForAccount,
  markChallengeUsed,
  saveWebAuthnCredential,
  updateAuthSession,
} from "@/lib/auth/store"
import { createRegistrationOptions, verifyRegistration } from "@/lib/webauthn/server"
import { getSessionIdFromCookie } from "@/lib/auth/session"

export async function POST() {
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
      return NextResponse.json({ error: "Complete email and OTP verification first." }, { status: 403 })
    }

    const account = await findAccountById(session.account_id)
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 })
    }

    const existingCredentials = await getWebAuthnCredentialsForAccount(account.id)
    const options = await createRegistrationOptions(
      account.id,
      account.full_name,
      existingCredentials
    )

    await createAuthChallenge({
      session_id: sessionId,
      challenge_type: "webauthn_register",
      token_hash: null,
      challenge_data: { challenge: options.challenge },
      expires_at: challengeExpiryIso(5),
    })

    return NextResponse.json({ options, hasExistingCredentials: existingCredentials.length > 0 })
  } catch (err) {
    console.error("WebAuthn register options error:", err)
    return NextResponse.json({ error: "Failed to generate registration options." }, { status: 500 })
  }
}
