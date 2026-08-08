/** Tiny className joiner — avoids pulling in clsx for a one-liner. */
export function cn(...parts: unknown[]) {
  return parts.filter((part) => typeof part === 'string' && part).join(' ')
}
