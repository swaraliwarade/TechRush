export type CardMapping = { letter: string; value: string }[]

/**
 * Placeholder A–F grid until real per-account mappings exist. One digit from
 * 0–9 per letter — six distinct digits, fully randomized (this grid also sits
 * on the account's card). Each letter maps to exactly one keypad tap in the
 * unlock challenge.
 */
export const PLACEHOLDER_MAPPING: CardMapping = [
  { letter: 'A', value: '0' },
  { letter: 'B', value: '6' },
  { letter: 'C', value: '7' },
  { letter: 'D', value: '4' },
  { letter: 'E', value: '9' },
  { letter: 'F', value: '5' },
]

/** Fisher–Yates shuffle — used for the challenge letters. */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Deterministic Fisher–Yates shuffle seeded by a number — the keypad keys are
 * laid out from this so the layout is stable for a given key and different for
 * every new key, without tripping hook dependency checks.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const copy = [...items]
  let s = seed >>> 0
  const rand = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export type Challenge = {
  /** The letters the user must answer for, in display order. */
  letters: string[]
  /** The digit expected for each letter, same order. */
  expected: string[]
}

/** Pick `count` distinct random letters and the digits expected for them. */
export function buildChallenge(
  count = 3,
  mapping: CardMapping = PLACEHOLDER_MAPPING,
): Challenge {
  const chosen = shuffle(mapping).slice(0, count)
  return {
    letters: chosen.map((m) => m.letter),
    expected: chosen.map((m) => m.value),
  }
}
