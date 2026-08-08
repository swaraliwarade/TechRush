/**
 * Errors that resolve on their own within a second or two.
 *
 * "JWT issued at future" is the notable one: a token minted by the auth server
 * can be a fraction ahead of the API gateway's clock, so the first request made
 * with a brand-new session gets rejected even though nothing is wrong. It is
 * always gone by the next attempt.
 */
const TRANSIENT = [
  /issued at future/i,
  /not yet valid/i,
  /failed to fetch/i,
  /network\s?error/i,
  /load failed/i,
]

export function isTransientError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error)
  return TRANSIENT.some((pattern) => pattern.test(message))
}

/**
 * Runs `task`, retrying only on transient failures. Anything else — a missing
 * table, a real auth failure — throws immediately, so genuine problems still
 * surface fast instead of being masked by a retry loop.
 */
export async function retryTransient<T>(
  task: () => Promise<T>,
  { attempts = 3, delayMs = 700 }: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await task()
    } catch (error) {
      lastError = error
      if (!isTransientError(error) || attempt === attempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }

  throw lastError
}
