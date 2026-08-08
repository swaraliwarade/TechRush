/**
 * Environment configuration.
 *
 * Deliberately does NOT fall back to placeholder credentials — a missing key
 * surfaces as a setup screen rather than a confusing runtime auth failure.
 */

/**
 * Must match Authentication → Sign In / Providers → Email → "Email OTP Length"
 * in the Supabase dashboard, or the code screen will ask for the wrong number
 * of digits. Supabase allows 6–10; its default is 6.
 */
function readOtpLength(): number {
  const parsed = Number(import.meta.env.VITE_OTP_LENGTH)
  if (!Number.isInteger(parsed) || parsed < 6 || parsed > 10) return 6
  return parsed
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  otpLength: readOtpLength(),
} as const

export type MissingEnvKey = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'

export function missingEnvKeys(): MissingEnvKey[] {
  const missing: MissingEnvKey[] = []
  if (!env.supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!env.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  return missing
}

export const isConfigured = () => missingEnvKeys().length === 0
