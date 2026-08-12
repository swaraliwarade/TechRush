import { useCallback, useEffect, useState } from 'react'

const RESEND_COOLDOWN = 30 // seconds after sending before a resend is allowed
const RETRY_COOLDOWN = 20 // seconds of forced wait after a wrong code
const MAX_ATTEMPTS = 5 // wrong codes before the user must request a fresh code
const LOCKOUT_SECONDS = 60

export function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Rate-limits OTP entry the way a security screen should: a cooldown after the
 * code is sent (so resend can't be spammed), a wait after every wrong code
 * (so brute-forcing a 6-digit token is not practical), and a lockout after a
 * handful of misses that forces a fresh code.
 */
export function useOtpCooldown() {
  const [resendIn, setResendIn] = useState(0)
  const [retryIn, setRetryIn] = useState(0)
  const [attempts, setAttempts] = useState(0)

  const ticking = resendIn > 0 || retryIn > 0
  useEffect(() => {
    if (!ticking) return
    const id = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0))
      setRetryIn((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [ticking])

  const locked = attempts >= MAX_ATTEMPTS

  // Crossing the attempt threshold upgrades both timers to the lockout length.
  useEffect(() => {
    if (!locked) return
    setResendIn((s) => Math.max(s, LOCKOUT_SECONDS))
    setRetryIn((s) => Math.max(s, LOCKOUT_SECONDS))
  }, [locked])

  /** Call after a code is (re)sent: resend waits, wrong-attempt count resets. */
  const codeSent = useCallback(() => {
    setResendIn(RESEND_COOLDOWN)
    setRetryIn(0)
    setAttempts(0)
  }, [])

  /** Call when a code is rejected: force a wait, count the miss. */
  const verifyFailed = useCallback(() => {
    setAttempts((n) => n + 1)
    setRetryIn(RETRY_COOLDOWN)
  }, [])

  /** Call on success: clear every gate. */
  const reset = useCallback(() => {
    setResendIn(0)
    setRetryIn(0)
    setAttempts(0)
  }, [])

  return { resendIn, retryIn, attempts, locked, codeSent, verifyFailed, reset }
}
