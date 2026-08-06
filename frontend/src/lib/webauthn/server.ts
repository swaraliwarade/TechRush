import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server"
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server"
import type { WebAuthnCredential } from "@/lib/auth/types"

export function getWebAuthnConfig() {
  const rpID = process.env.WEBAUTHN_RP_ID || "localhost"
  const rpName = process.env.WEBAUTHN_RP_NAME || "TrustPass Bank"
  const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000"
  return { rpID, rpName, origin }
}

export async function createRegistrationOptions(
  accountId: string,
  accountName: string,
  existingCredentials: WebAuthnCredential[]
) {
  const { rpID, rpName } = getWebAuthnConfig()
  return generateRegistrationOptions({
    rpName,
    rpID,
    userName: accountId,
    userDisplayName: accountName,
    attestationType: "none",
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credential_id,
      transports: (cred.transports ?? []) as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
  })
}

export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
) {
  const { rpID, origin } = getWebAuthnConfig()
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  })
}

export async function createAuthenticationOptions(credentials: WebAuthnCredential[]) {
  const { rpID } = getWebAuthnConfig()
  return generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: credentials.map((cred) => ({
      id: cred.credential_id,
      transports: (cred.transports ?? []) as AuthenticatorTransportFuture[],
    })),
  })
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: WebAuthnCredential
) {
  const { rpID, origin } = getWebAuthnConfig()
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credential_id,
      publicKey: Buffer.from(credential.public_key, "base64url"),
      counter: credential.counter,
      transports: (credential.transports ?? []) as AuthenticatorTransportFuture[],
    },
    requireUserVerification: true,
  })
}

