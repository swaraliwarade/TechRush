import { NextResponse } from "next/server"
import {
  challengeExpiryIso,
  generateToken,
  hashToken,
  generateOtpCode,
  sessionExpiryIso,
} from "@/lib/auth/crypto"
import {
  createAuthChallenge,
  createAuthSession,
  findAccountByEmailAndCustomerId,
} from "@/lib/auth/store"
import { createSessionCookie } from "@/lib/auth/session"

interface SignInRequest {
  email: string
  customerId: string
}

export async function POST(request: Request) {
  try {
    const body: SignInRequest = await request.json()
    const { email, customerId } = body

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 })
    }

    const customerIdRegex = /^[a-zA-Z0-9]{6,12}$/
    if (!customerId || !customerIdRegex.test(customerId)) {
      return NextResponse.json(
        { error: "Customer ID must be 6 to 12 alphanumeric characters." },
        { status: 400 }
      )
    }

    const account = await findAccountByEmailAndCustomerId(email, customerId)
    if (!account) {
      return NextResponse.json(
        { error: "No account found with this email and Customer ID combination." },
        { status: 401 }
      )
    }

    const expiresAt = sessionExpiryIso(30)
    const session = await createAuthSession(account.id, expiresAt)

    const emailToken = generateToken()
    await createAuthChallenge({
      session_id: session.id,
      challenge_type: "email",
      token_hash: hashToken(emailToken),
      challenge_data: null,
      expires_at: challengeExpiryIso(15),
    })

    const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000"
    const verifyUrl = `${origin}/signin/verify-email?token=${encodeURIComponent(emailToken)}`

    console.log(`[MOCK EMAIL] Verification link for ${account.email}: ${verifyUrl}`)

    await createSessionCookie(session.id, expiresAt)

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Check your inbox.",
      nextStep: "email",
      devVerifyUrl: process.env.NODE_ENV === "development" ? verifyUrl : undefined,
    })
  } catch (err) {
    console.error("Sign-in API error:", err)
    return NextResponse.json({ error: "Internal server error occurred." }, { status: 500 })
  }
}
