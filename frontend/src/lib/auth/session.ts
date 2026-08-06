import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import type { SessionStatus } from "@/lib/auth/types"
import {
  findAccountById,
  getAuthSession,
  toSessionAccountView,
  updateAuthSession,
} from "@/lib/auth/store"
import { isExpired } from "@/lib/auth/crypto"

export const SESSION_COOKIE = "trustpass_session"

function getSessionSecret(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET || "trustpass-dev-session-secret-change-me"
  return new TextEncoder().encode(secret)
}

export async function createSessionCookie(sessionId: string, expiresAt: string): Promise<void> {
  const token = await new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(new Date(expiresAt).getTime() / 1000))
    .sign(getSessionSecret())

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSessionIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSessionSecret())
    return typeof payload.sid === "string" ? payload.sid : null
  } catch {
    return null
  }
}

export function resolveNextStep(
  emailVerified: boolean,
  phoneVerified: boolean,
  biometricVerified: boolean
): SessionStatus["nextStep"] {
  if (!emailVerified) return "email"
  if (!phoneVerified) return "otp"
  if (!biometricVerified) return "biometric"
  return "dashboard"
}

export async function getSessionStatus(sessionId: string): Promise<SessionStatus | null> {
  const session = await getAuthSession(sessionId)
  if (!session || isExpired(session.expires_at)) {
    return null
  }

  const account = await findAccountById(session.account_id)
  return {
    sessionId: session.id,
    emailVerified: session.email_verified,
    phoneVerified: session.phone_verified,
    biometricVerified: session.biometric_verified,
    account: account ? toSessionAccountView(account) : null,
    nextStep: resolveNextStep(
      session.email_verified,
      session.phone_verified,
      session.biometric_verified
    ),
  }
}

export async function requireSessionFromCookie(): Promise<SessionStatus | null> {
  const sessionId = await getSessionIdFromCookie()
  if (!sessionId) return null
  return getSessionStatus(sessionId)
}

export async function touchSession(sessionId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  await updateAuthSession(sessionId, { expires_at: expiresAt })
  await createSessionCookie(sessionId, expiresAt)
}

export async function isDashboardAuthorized(sessionId: string): Promise<boolean> {
  const status = await getSessionStatus(sessionId)
  return !!status && status.nextStep === "dashboard"
}
