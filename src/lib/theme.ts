/**
 * Light/dark appearance.
 *
 * The active theme is always mirrored to `document.documentElement.dataset.theme`
 * (the CSS in `index.css` keys off `html[data-theme='light']`), and remembered
 * on this device so the next visit never flashes the wrong theme.
 *
 * The per-user copy lives on `profiles.theme`; `SessionGates` re-applies it on
 * login so the choice follows the account across devices.
 *
 * New visitors start light — public pages are always light, and the first
 * dashboard visit asks the user to pick a theme (`ThemeChoiceDialog`). The
 * `trustpass.themeAsked` flag keeps that prompt to a single appearance per
 * device until an explicit choice is made.
 */

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'trustpass.theme'
const ASKED_KEY = 'trustpass.themeAsked'

/** Applies a theme to the document and remembers it on this device. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private browsing can throw; the theme still applies for this session.
  }
}

/** The theme chosen on this device; brand-new visitors default to light. */
export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Fall through to the default.
  }
  return 'light'
}

/** Whether the user has made an explicit theme choice (prompt or Settings). */
export function hasChosenTheme(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    return false
  }
}

/** Records an explicit theme choice so the first-visit prompt stops asking. */
export function markThemeChosen() {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    // Private browsing can throw; the prompt simply shows again next visit.
  }
}
