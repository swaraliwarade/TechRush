import { NextResponse } from "next/server"
import {
  challengeExpiryIso,
  generateOtpCode,
  hashSecret,
  hashToken,
  isExpired,
} from "@/lib/auth/crypto"
import {
  createAuthChallenge,
  findAccountById,
  findChallengeByTokenHash,
  getAuthSession,
  markChallengeUsed,
  updateAuthSession,
} from "@/lib/auth/store"
import { createSessionCookie, getSessionIdFromCookie } from "@/lib/auth/session"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Missing verification token." }, { status: 400 })
    }

    const challenge = await findChallengeByTokenHash(hashToken(token), "email")
    if (!challenge || isExpired(challenge.expires_at)) {
      return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 400 })
    }

    const session = await getAuthSession(challenge.session_id)
    if (!session || isExpired(session.expires_at)) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 })
    }

    await markChallengeUsed(challenge.id)
    const updatedSession = await updateAuthSession(session.id, { email_verified: true })
    if (!updatedSession) {
      return NextResponse.json({ error: "Failed to update session." }, { status: 500 })
    }

    const account = await findAccountById(session.account_id)
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 })
    }

    const otp = generateOtpCode()
    await createAuthChallenge({
      session_id: session.id,
      challenge_type: "otp",
      token_hash: await hashSecret(otp),
      challenge_data: { attempts: 0 },
      expires_at: challengeExpiryIso(5),
    })

    const maskedPhone = account.phone_number
      ? account.phone_number.replace(/(\+\d{1,3})?(\d{2,3})\d+(\d{2})/, "$1$2•••••$3")
      : "your registered phone"

    console.log(`[MOCK SMS] OTP for ${account.email}: ${otp}`)

    await createSessionCookie(session.id, updatedSession.expires_at)

    return NextResponse.json({
      success: true,
      message: "Email verified. OTP sent to your phone.",
      nextStep: "otp",
      maskedPhone,
      devOtp: process.env.NODE_ENV === "development" ? otp : undefined,
    })
  } catch (err) {
    console.error("Email verification error:", err)
    return NextResponse.json({ error: "Internal server error occurred." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = body.token as string | undefined

    if (!token) {
      return NextResponse.json({ error: "Missing verification token." }, { status: 400 })
    }

    const url = new URL(request.url)
    url.searchParams.set("token", token)
    const getRequest = new Request(url.toString(), { method: "GET" })
    return GET(getRequest)
  } catch (err) {
    console.error("Email verification POST error:", err)
    return NextResponse.json({ error: "Internal server error occurred." }, { status: 500 })
  }
}
