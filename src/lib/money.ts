/**
 * All money moves through the app as integer minor units (paise).
 *
 * Formatting uses the en-IN locale so amounts group in the Indian system
 * (lakh/crore): 2,48,930.55 rather than 248,930.55.
 */

export const DEFAULT_CURRENCY = 'INR'
const LOCALE = 'en-IN'

export function formatMoney(
  cents: number,
  currency: string | null | undefined = DEFAULT_CURRENCY,
  showSign = false,
) {
  const value = cents / 100
  const formatted = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    // Intl throws RangeError on a null/empty code, and an uncaught throw here
    // unmounts the whole tree. Never let a missing currency blank the screen.
    currency: currency || DEFAULT_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))

  if (!showSign) return formatted
  return `${cents < 0 ? '−' : '+'}${formatted}`
}

/** Compact form for chart axes: ₹2.5L */
export function formatCompact(cents: number, currency: string | null | undefined = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: currency || DEFAULT_CURRENCY,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100)
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
}
