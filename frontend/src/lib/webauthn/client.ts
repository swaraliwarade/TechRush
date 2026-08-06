"use client"

import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser"

export function isBrowserWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && browserSupportsWebAuthn()
}

export async function registerPasskey(options: PublicKeyCredentialCreationOptionsJSON) {
  return startRegistration({ optionsJSON: options })
}

export async function authenticatePasskey(options: PublicKeyCredentialRequestOptionsJSON) {
  return startAuthentication({ optionsJSON: options })
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isBrowserWebAuthnSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}
