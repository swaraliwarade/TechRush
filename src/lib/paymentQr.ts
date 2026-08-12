/**
 * Payload scheme for TrustPass payment QRs. A request is a simple URL:
 *
 *   trustpass://pay?amount=<cents>&to=<account name>&note=<optional>&expires=<ms>&req=<uuid>
 *
 * Creating a QR encodes this payload; scanning one decodes it back so the
 * receiver can confirm and pay the exact request. `expires` bounds how long the
 * request stays payable — the creator sees a live countdown and the scanner
 * rejects an expired request. `req` makes every QR a distinct request.
 */
const QR_PREFIX = 'trustpass://pay'

export const QR_TTL_MS = {
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
} as const

export type QrTtlKey = keyof typeof QR_TTL_MS

export const QR_TTL_OPTIONS: { key: QrTtlKey; label: string }[] = [
  { key: '5m', label: '5 min' },
  { key: '15m', label: '15 min' },
  { key: '30m', label: '30 min' },
]

export type PaymentQrPayload = {
  amountCents: number
  note: string
  /** The payee's account name — what the scanned payment is credited to. */
  to: string
  /** Unix ms after which the request is no longer payable. */
  expires: number
  /** Unique request id, so each QR is a distinct payment request. */
  req: string
}

export function buildQrPayload({
  amountCents,
  note,
  to,
  expires,
}: {
  amountCents: number
  note: string
  to: string
  expires: number
}): string {
  const params = new URLSearchParams({
    amount: String(amountCents),
    to,
    expires: String(expires),
    req: crypto.randomUUID(),
  })
  if (note.trim()) params.set('note', note.trim())
  return `${QR_PREFIX}?${params.toString()}`
}

export function parsePaymentQr(text: string): PaymentQrPayload | null {
  if (!text.startsWith(`${QR_PREFIX}?`)) return null
  const params = new URLSearchParams(text.slice(QR_PREFIX.length + 1))
  const amount = Number(params.get('amount'))
  const expires = Number(params.get('expires'))
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (!Number.isFinite(expires) || expires <= 0) return null
  return {
    amountCents: Math.round(amount),
    note: params.get('note') ?? '',
    to: params.get('to') ?? '',
    expires,
    req: params.get('req') ?? '',
  }
}

/** "2m 04s" or "Expired" — used for countdowns in both modals. */
export function formatRemaining(ms: number) {
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}
