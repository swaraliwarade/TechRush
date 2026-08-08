/**
 * Client-side mirror of public.pin_is_weak() in migration 0005.
 *
 * This exists for immediate feedback only — the RPC is directly callable, so
 * the server check is the authoritative one. Keep the two in sync.
 */

const SEQUENTIAL = new Set([
  '012345',
  '123456',
  '234567',
  '345678',
  '456789',
  '987654',
  '876543',
  '765432',
  '654321',
  '543210',
])

export const PIN_LENGTH = 6

export function validatePin(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return 'Enter exactly 6 digits.'
  if (/^(\d)\1{5}$/.test(pin)) return "That's the same digit six times. Choose something less guessable."
  if (SEQUENTIAL.has(pin)) return "That's a straight run of digits. Choose something less guessable."
  return null
}

export function validatePinPair(first: string, second: string): string | null {
  const firstError = validatePin(first)
  if (firstError) return firstError

  const secondError = validatePin(second)
  if (secondError) return secondError

  if (first === second) return 'This PIN must be different from your first one.'
  return null
}
