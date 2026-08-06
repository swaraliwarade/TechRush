import { NextResponse } from "next/server"
import { challengeExpiryIso, isExpired } from "@/lib/auth/crypto"
import {
  createAuthChallenge,
  findAccountById,
  getAuthSession,
  getWebAuthnCredentialsForAccount,
} from "@/lib/auth/store"
import { createAuthenticationOptions } from "@/lib/webauthn/server"
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
      return NextResponse.json({ error: "Complete prior verification steps first." }, { status: 403 })
    }

    const credentials = await getWebAuthnCredentialsForAccount(session.account_id)
    if (credentials.length === 0) {
      return NextResponse.json({ error: "No passkey registered. Register first." }, { status: 404 })
    }

    const options = await createAuthenticationOptions(credentials)

    await createAuthChallenge({
      session_id: sessionId,
      challenge_type: "webauthn_login",
      token_hash: null,
      challenge_data: { challenge: options.challenge },
      expires_at: challengeExpiryIso(5),
    })

    return NextResponse.json({ options })
  } catch (err) {
    console.error("WebAuthn login options error:", err)
    return NextResponse.json({ error: "Failed to generate authentication options." }, { status: 500 })
  }
}
