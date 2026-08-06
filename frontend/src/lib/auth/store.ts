import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { isSupabaseConfigured } from "@/lib/supabase"
import type {
  AccountRecord,
  AuthChallenge,
  AuthSession,
  SessionAccountView,
  WebAuthnCredential,
} from "@/lib/auth/types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export const isSupabaseAdminConfigured = isSupabaseConfigured && !!serviceRoleKey

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

declare global {
  // eslint-disable-next-line no-var
  var __trustpassSessions: Map<string, AuthSession> | undefined
  // eslint-disable-next-line no-var
  var __trustpassChallenges: Map<string, AuthChallenge> | undefined
  // eslint-disable-next-line no-var
  var __trustpassAccounts: Map<string, AccountRecord> | undefined
  // eslint-disable-next-line no-var
  var __trustpassCredentials: Map<string, WebAuthnCredential> | undefined
}

function memorySessions() {
  if (!globalThis.__trustpassSessions) {
    globalThis.__trustpassSessions = new Map()
  }
  return globalThis.__trustpassSessions
}

function memoryChallenges() {
  if (!globalThis.__trustpassChallenges) {
    globalThis.__trustpassChallenges = new Map()
  }
  return globalThis.__trustpassChallenges
}

function memoryAccounts() {
  if (!globalThis.__trustpassAccounts) {
    globalThis.__trustpassAccounts = new Map()
  }
  return globalThis.__trustpassAccounts
}

function memoryCredentials() {
  if (!globalThis.__trustpassCredentials) {
    globalThis.__trustpassCredentials = new Map()
  }
  return globalThis.__trustpassCredentials
}

export async function findAccountByEmailAndCustomerId(
  email: string,
  customerId: string
): Promise<AccountRecord | null> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("accounts")
      .select("id, full_name, email, customer_id, phone_number")
      .eq("email", email.trim().toLowerCase())
      .eq("customer_id", customerId.trim())
      .maybeSingle()
    if (error) throw error
    return data
  }

  for (const account of memoryAccounts().values()) {
    if (
      account.email === email.trim().toLowerCase() &&
      account.customer_id === customerId.trim()
    ) {
      return account
    }
  }

  if (email.toLowerCase() !== "notfound@test.com") {
    const id = `sim-${customerId.trim()}`
    const account: AccountRecord = {
      id,
      full_name: "Demo User",
      email: email.trim().toLowerCase(),
      customer_id: customerId.trim(),
      phone_number: "+15550123456",
    }
    memoryAccounts().set(id, account)
    return account
  }

  return null
}

export async function findAccountById(accountId: string): Promise<AccountRecord | null> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("accounts")
      .select("id, full_name, email, customer_id, phone_number")
      .eq("id", accountId)
      .maybeSingle()
    if (error) throw error
    return data
  }
  return memoryAccounts().get(accountId) ?? null
}

export async function createAuthSession(
  accountId: string,
  expiresAt: string
): Promise<AuthSession> {
  const session: AuthSession = {
    id: crypto.randomUUID(),
    account_id: accountId,
    email_verified: false,
    phone_verified: false,
    biometric_verified: false,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  }

  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("auth_sessions")
      .insert(session)
      .select("*")
      .single()
    if (error) throw error
    return data as AuthSession
  }

  memorySessions().set(session.id, session)
  return session
}

export async function getAuthSession(sessionId: string): Promise<AuthSession | null> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("auth_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle()
    if (error) throw error
    return data as AuthSession | null
  }
  return memorySessions().get(sessionId) ?? null
}

export async function updateAuthSession(
  sessionId: string,
  patch: Partial<
    Pick<AuthSession, "email_verified" | "phone_verified" | "biometric_verified" | "expires_at">
  >
): Promise<AuthSession | null> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("auth_sessions")
      .update(patch)
      .eq("id", sessionId)
      .select("*")
      .single()
    if (error) throw error
    return data as AuthSession
  }

  const existing = memorySessions().get(sessionId)
  if (!existing) return null
  const updated = { ...existing, ...patch }
  memorySessions().set(sessionId, updated)
  return updated
}

export async function createAuthChallenge(
  input: Omit<AuthChallenge, "id" | "used" | "created_at">
): Promise<AuthChallenge> {
  const challenge: AuthChallenge = {
    id: crypto.randomUUID(),
    ...input,
    used: false,
    created_at: new Date().toISOString(),
  }

  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("auth_challenges")
      .insert(challenge)
      .select("*")
      .single()
    if (error) throw error
    return data as AuthChallenge
  }

  memoryChallenges().set(challenge.id, challenge)
  return challenge
}

export async function getAuthChallenge(challengeId: string): Promise<AuthChallenge | null> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("auth_challenges")
      .select("*")
      .eq("id", challengeId)
      .maybeSingle()
    if (error) throw error
    return data as AuthChallenge | null
  }
  return memoryChallenges().get(challengeId) ?? null
}

export async function findChallengeByTokenHash(
  tokenHash: string,
  challengeType: AuthChallenge["challenge_type"]
): Promise<AuthChallenge | null> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("auth_challenges")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("challenge_type", challengeType)
      .eq("used", false)
      .maybeSingle()
    if (error) throw error
    return data as AuthChallenge | null
  }

  for (const challenge of memoryChallenges().values()) {
    if (
      challenge.token_hash === tokenHash &&
      challenge.challenge_type === challengeType &&
      !challenge.used
    ) {
      return challenge
    }
  }
  return null
}

export async function getLatestChallengeForSession(
  sessionId: string,
  challengeType: AuthChallenge["challenge_type"]
): Promise<AuthChallenge | null> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("auth_challenges")
      .select("*")
      .eq("session_id", sessionId)
      .eq("challenge_type", challengeType)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data as AuthChallenge | null
  }

  let latest: AuthChallenge | null = null
  for (const challenge of memoryChallenges().values()) {
    if (
      challenge.session_id === sessionId &&
      challenge.challenge_type === challengeType &&
      !challenge.used
    ) {
      if (!latest || challenge.created_at > latest.created_at) {
        latest = challenge
      }
    }
  }
  return latest
}

export async function markChallengeUsed(challengeId: string): Promise<void> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { error } = await admin
      .from("auth_challenges")
      .update({ used: true })
      .eq("id", challengeId)
    if (error) throw error
    return
  }

  const challenge = memoryChallenges().get(challengeId)
  if (challenge) {
    memoryChallenges().set(challengeId, { ...challenge, used: true })
  }
}

export async function updateChallengeData(
  challengeId: string,
  challengeData: Record<string, unknown>
): Promise<void> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { error } = await admin
      .from("auth_challenges")
      .update({ challenge_data: challengeData })
      .eq("id", challengeId)
    if (error) throw error
    return
  }

  const challenge = memoryChallenges().get(challengeId)
  if (challenge) {
    memoryChallenges().set(challengeId, { ...challenge, challenge_data: challengeData })
  }
}

export async function saveWebAuthnCredential(
  credential: Omit<WebAuthnCredential, "id" | "created_at">
): Promise<WebAuthnCredential> {
  const record: WebAuthnCredential = {
    id: crypto.randomUUID(),
    ...credential,
    created_at: new Date().toISOString(),
  }

  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("webauthn_credentials")
      .insert(record)
      .select("*")
      .single()
    if (error) throw error
    return data as WebAuthnCredential
  }

  memoryCredentials().set(record.credential_id, record)
  return record
}

export async function getWebAuthnCredentialsForAccount(
  accountId: string
): Promise<WebAuthnCredential[]> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("webauthn_credentials")
      .select("*")
      .eq("account_id", accountId)
    if (error) throw error
    return (data ?? []) as WebAuthnCredential[]
  }

  return [...memoryCredentials().values()].filter((c) => c.account_id === accountId)
}

export async function getWebAuthnCredentialById(
  credentialId: string
): Promise<WebAuthnCredential | null> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { data, error } = await admin
      .from("webauthn_credentials")
      .select("*")
      .eq("credential_id", credentialId)
      .maybeSingle()
    if (error) throw error
    return data as WebAuthnCredential | null
  }
  return memoryCredentials().get(credentialId) ?? null
}

export async function updateWebAuthnCounter(
  credentialId: string,
  counter: number
): Promise<void> {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { error } = await admin
      .from("webauthn_credentials")
      .update({ counter })
      .eq("credential_id", credentialId)
    if (error) throw error
    return
  }

  const existing = memoryCredentials().get(credentialId)
  if (existing) {
    memoryCredentials().set(credentialId, { ...existing, counter })
  }
}

export function toSessionAccountView(account: AccountRecord): SessionAccountView {
  return {
    id: account.id,
    full_name: account.full_name,
    email: account.email,
    customer_id: account.customer_id,
    phone_number: account.phone_number,
  }
}
