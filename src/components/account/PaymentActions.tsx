import { Camera, Download, Lock, QrCode, ScanLine, Send, Unlock, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import {
  buildQrPayload,
  formatRemaining,
  parsePaymentQr,
  QR_TTL_MS,
  QR_TTL_OPTIONS,
  type PaymentQrPayload,
} from '@/lib/paymentQr'
import { formatMoney } from '@/lib/money'

export type PaymentDraft = {
  merchant: string
  amountCents: number
  note: string
}

type ModalState = 'payment' | 'create-qr' | 'scan-qr' | null

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: ReactNode
}) {
  // Portaled to <body>: the page shell animates <main> with a transform and
  // cards carry backdrop-blur, either of which would otherwise trap the fixed
  // overlay and clip it to its parent card.
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <div aria-hidden className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-sm">
        <Card className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mist-400">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="focus-ring -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-mist-400 transition hover:bg-white/6 hover:text-mist-50"
            >
              <X size={17} />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </Card>
      </div>
    </div>,
    document.body,
  )
}

function amountToCents(raw: string): number {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round(value * 100)
}

function MakePaymentModal({
  currency,
  onPay,
  onClose,
}: {
  currency: string
  onPay: (draft: PaymentDraft) => void
  onClose: () => void
}) {
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)

  const cents = amountToCents(amount)
  const valid = merchant.trim().length > 0 && cents > 0

  function submit() {
    if (!valid) return
    onPay({ merchant: merchant.trim(), amountCents: cents, note: note.trim() })
    setDone(true)
  }

  if (done) {
    return (
      <Modal title="Payment sent" subtitle="It will show in your history as pending." onClose={onClose}>
        <div className="text-center">
          <span className="accent-gradient mx-auto grid size-14 place-items-center rounded-2xl text-on-accent">
            <Send size={24} />
          </span>
          <p className="mt-4 text-xl font-semibold tabular-nums tracking-tight">
            {formatMoney(cents, currency, true)}
          </p>
          <p className="mt-1 text-sm text-mist-400">to {merchant}</p>
          <Button className="mt-6 w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Make a payment" subtitle="Sends money from this account." onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Pay to"
          placeholder="Name or merchant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          autoFocus
        />
        <Input
          label="Amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          hint={cents > 0 ? `${formatMoney(cents, currency)} to be sent` : undefined}
        />
        <Input
          label="Note (optional)"
          placeholder="What's it for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button className="w-full" onClick={submit} disabled={!valid}>
          <Send size={16} /> Send payment
        </Button>
      </div>
    </Modal>
  )
}

function CreateQrModal({
  currency,
  accountName,
  onClose,
}: {
  currency: string
  accountName: string
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [validityMs, setValidityMs] = useState(QR_TTL_MS['5m'])
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const cents = amountToCents(amount)
  const remainingMs = expiresAt ? Math.max(0, expiresAt - now) : 0
  const expired = qrDataUrl !== null && remainingMs <= 0

  // Tick once a second while a QR is on screen so the countdown stays live.
  useEffect(() => {
    if (qrDataUrl === null || expiresAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [qrDataUrl, expiresAt])

  function resetQr() {
    setQrDataUrl(null)
    setExpiresAt(null)
  }

  async function generate() {
    if (cents <= 0) {
      setError('Enter an amount first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const expires = Date.now() + validityMs
      const payload = buildQrPayload({ amountCents: cents, note, to: accountName, expires })
      const url = await QRCode.toDataURL(payload, {
        width: 264,
        margin: 2,
        color: { dark: '#0b1020', light: '#ffffff' },
      })
      setQrDataUrl(url)
      setExpiresAt(expires)
      setNow(Date.now())
    } catch {
      setError("Couldn't generate the QR code. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Create a payment QR"
      subtitle="Anyone who scans it can pay this request before it expires."
      onClose={onClose}
    >
      <div className="space-y-4">
        <Input
          label="Amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            resetQr()
          }}
        />
        <Input
          label="Note (optional)"
          placeholder="What's it for?"
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            resetQr()
          }}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-mist-300">Valid for</p>
          <div className="grid grid-cols-3 gap-2">
            {QR_TTL_OPTIONS.map((option) => {
              const active = validityMs === QR_TTL_MS[option.key]
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setValidityMs(QR_TTL_MS[option.key])
                    resetQr()
                  }}
                  aria-pressed={active}
                  className={cn(
                    'focus-ring h-10 rounded-full border text-sm font-medium transition',
                    active
                      ? 'border-accent-500/40 bg-accent-500/15 text-accent-400'
                      : 'border-white/10 bg-white/4 text-mist-300 hover:border-white/20 hover:text-mist-50',
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        {qrDataUrl ? (
          <div className="text-center">
            <div className="relative mx-auto w-fit rounded-2xl border border-white/10 bg-white p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]">
              <img
                src={qrDataUrl}
                alt={`QR code for ${formatMoney(cents, currency)} payment request`}
                width={264}
                height={264}
                className={cn('transition', expired && 'opacity-30 grayscale')}
              />
              {expired && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="rounded-full bg-ink-950/90 px-4 py-1.5 text-sm font-semibold text-loss-400">
                    Expired
                  </span>
                </span>
              )}
            </div>
            <p className="mt-3 text-sm font-medium">
              Payment request · {formatMoney(cents, currency)}
            </p>
            {note.trim() && <p className="mt-0.5 text-xs text-mist-500">{note.trim()}</p>}
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tabular-nums',
                expired
                  ? 'border-loss-400/25 bg-loss-400/12 text-loss-400'
                  : 'border-gain-400/25 bg-gain-400/12 text-gain-400',
              )}
            >
              <span className={cn('size-1.5 rounded-full', expired ? 'bg-loss-400' : 'bg-gain-400')} />
              {expired ? 'Expired — generate a new one' : `Valid for ${formatRemaining(remainingMs)}`}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Button variant="outline" onClick={generate} disabled={busy}>
                <QrCode size={15} /> New QR
              </Button>
              <a
                href={qrDataUrl}
                download="trustpass-payment-qr.png"
                aria-disabled={expired}
                className={cn(
                  'focus-ring accent-gradient inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-on-accent transition hover:brightness-110',
                  expired && 'pointer-events-none opacity-40',
                )}
              >
                <Download size={15} /> Download
              </a>
            </div>
          </div>
        ) : (
          <Button className="w-full" onClick={generate} disabled={busy || cents <= 0}>
            <QrCode size={16} /> {busy ? 'Generating…' : 'Generate QR'}
          </Button>
        )}
      </div>
    </Modal>
  )
}

function ScanQrModal({
  currency,
  onPay,
  onClose,
}: {
  currency: string
  onPay: (draft: PaymentDraft) => void
  onClose: () => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [decoding, setDecoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<PaymentQrPayload | null>(null)
  const [done, setDone] = useState(false)
  const [now, setNow] = useState(Date.now())
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const expired = parsed !== null && now > parsed.expires

  // Tick while a parsed request is on screen so its validity stays live.
  useEffect(() => {
    if (!parsed || done) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [parsed, done])

  /** Decode a QR from an image file: downscale on a canvas, then read pixels. */
  async function decodeFile(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read that file.'))
      reader.readAsDataURL(file)
    })

    setPreviewUrl(dataUrl)
    setParsed(null)
    setError(null)
    setDecoding(true)
    try {
      // onload-based loading: more broadly supported than img.decode(), which
      // can hang in some embedded/headless browsers.
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('Could not read that image.'))
        image.src = dataUrl
      })

      const scale = Math.min(1, 512 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Canvas is not supported here.')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (!code) {
        setError('No QR code found in that image. Try a clearer shot.')
        return
      }
      const request = parsePaymentQr(code.data)
      if (!request) {
        setError("That QR isn't a TrustPass payment request.")
        return
      }
      if (Date.now() > request.expires) {
        setError('This payment request has expired. Ask for a fresh QR.')
        return
      }
      setParsed(request)
      setNow(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not decode that image.')
    } finally {
      setDecoding(false)
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void decodeFile(file)
    e.target.value = ''
  }

  function confirm() {
    if (!parsed) return
    onPay({
      merchant: parsed.to || 'QR payment',
      amountCents: parsed.amountCents,
      note: parsed.note,
    })
    setDone(true)
  }

  if (done) {
    return (
      <Modal title="Payment sent" subtitle="It will show in your history as pending." onClose={onClose}>
        <div className="text-center">
          <span className="accent-gradient mx-auto grid size-14 place-items-center rounded-2xl text-on-accent">
            <Send size={24} />
          </span>
          <p className="mt-4 text-xl font-semibold tabular-nums tracking-tight">
            {parsed ? formatMoney(parsed.amountCents, currency, true) : ''}
          </p>
          <p className="mt-1 text-sm text-mist-400">from the scanned QR</p>
          <Button className="mt-6 w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Scan or upload a QR"
      subtitle="Point it at a TrustPass payment request."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <ScanLine size={16} /> Upload image
          </Button>
          <Button variant="outline" onClick={() => cameraRef.current?.click()}>
            <Camera size={16} /> Open camera
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
          aria-label="Upload a QR image"
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onFile}
          aria-label="Scan a QR with the camera"
        />

        {decoding && <Alert tone="info">Reading the QR code…</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        {previewUrl && (
          <div className="text-center">
            <img
              src={previewUrl}
              alt="Selected QR code"
              className="mx-auto max-h-56 rounded-2xl border border-white/10 object-contain"
            />
            {parsed && (
              <div className="mt-4 text-left">
                <div className="glass-tile flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-xs text-mist-500">Pay to</p>
                    <p className="truncate text-sm font-semibold">{parsed.to || 'QR payment'}</p>
                    {parsed.note && (
                      <p className="mt-0.5 truncate text-xs text-mist-500">{parsed.note}</p>
                    )}
                    {parsed.req && (
                      <p className="mt-0.5 text-xs tabular-nums text-mist-500">
                        Request #{parsed.req.slice(0, 8).toUpperCase()}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(parsed.amountCents, currency, true)}
                  </p>
                </div>
                <p
                  className={cn(
                    'mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tabular-nums',
                    expired
                      ? 'border-loss-400/25 bg-loss-400/12 text-loss-400'
                      : 'border-gain-400/25 bg-gain-400/12 text-gain-400',
                  )}
                >
                  <span
                    className={cn('size-1.5 rounded-full', expired ? 'bg-loss-400' : 'bg-gain-400')}
                  />
                  {expired ? 'Expired — this request can no longer be paid' : `Valid for ${formatRemaining(parsed.expires - now)}`}
                </p>
                {expired && <Alert tone="error" className="mt-3">This payment request has expired. Ask for a fresh QR.</Alert>}
                <Button className="mt-4 w-full" onClick={confirm} disabled={expired}>
                  <Send size={16} /> Confirm & pay
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

/**
 * The action bar for the transactions page: make a payment, create a payment
 * QR, or scan/upload one. While `locked`, the actions hide behind a compact
 * gate — unlocking runs the card-mapping step-up (CardChallengeModal), which
 * the page owns. Payments are handed back to the page as drafts, so this stays
 * a pure input component.
 */
export function PaymentActions({
  currency,
  accountName,
  locked,
  onUnlock,
  onPayment,
}: {
  currency: string
  accountName: string
  locked: boolean
  onUnlock: () => void
  onPayment: (draft: PaymentDraft) => void
}) {
  const [modal, setModal] = useState<ModalState>(null)

  if (locked) {
    return (
      <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-warn-400/25 bg-warn-400/12 text-warn-400">
          <Lock size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Payments are locked</p>
          <p className="mt-0.5 text-xs leading-relaxed text-mist-500">
            Confirm your card mapping before sending money.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onUnlock}>
          <Unlock size={14} /> Unlock
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        <Button onClick={() => setModal('payment')}>
          <Send size={16} /> Make a payment
        </Button>
        <Button variant="outline" onClick={() => setModal('create-qr')}>
          <QrCode size={16} /> Create QR
        </Button>
        <Button variant="outline" onClick={() => setModal('scan-qr')}>
          <ScanLine size={16} /> Scan / upload QR
        </Button>
      </div>

      {modal === 'payment' && (
        <MakePaymentModal
          currency={currency}
          onPay={onPayment}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'create-qr' && (
        <CreateQrModal currency={currency} accountName={accountName} onClose={() => setModal(null)} />
      )}
      {modal === 'scan-qr' && (
        <ScanQrModal currency={currency} onPay={onPayment} onClose={() => setModal(null)} />
      )}
    </>
  )
}
