import { createHash, randomBytes } from "crypto"
import bcrypt from "bcryptjs"

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function hashSecret(value: string): Promise<string> {
  return bcrypt.hash(value, 10)
}

export async function verifySecret(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash)
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function sessionExpiryIso(minutes = 30): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

export function challengeExpiryIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

export function isExpired(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now()
}
