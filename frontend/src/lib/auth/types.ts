export interface AccountRecord {
  id: string
  full_name: string
  email: string
  customer_id: string
  phone_number: string | null
}

export interface AuthSession {
  id: string
  account_id: string
  email_verified: boolean
  phone_verified: boolean
  biometric_verified: boolean
  expires_at: string
  created_at: string
}

export interface AuthChallenge {
  id: string
  session_id: string
  challenge_type: "email" | "otp" | "webauthn_register" | "webauthn_login"
  token_hash: string | null
  challenge_data: Record<string, unknown> | null
  used: boolean
  expires_at: string
  created_at: string
}

export interface WebAuthnCredential {
  id: string
  account_id: string
  credential_id: string
  public_key: string
  counter: number
  device_type: "retail" | "commercial"
  transports: string[] | null
  created_at: string
}

export interface SessionAccountView {
  id: string
  full_name: string
  email: string
  customer_id: string
  phone_number: string | null
}

export interface SessionStatus {
  sessionId: string
  emailVerified: boolean
  phoneVerified: boolean
  biometricVerified: boolean
  account: SessionAccountView | null
  nextStep: "email" | "otp" | "biometric" | "dashboard"
}
