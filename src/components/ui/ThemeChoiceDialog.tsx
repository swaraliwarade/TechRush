import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { setProfileTheme } from '@/lib/profile'
import { applyTheme, hasChosenTheme, markThemeChosen, type Theme } from '@/lib/theme'

/**
 * First-visit theme picker. Public pages are always light; this is where the
 * user chooses their look once, on the dashboard. The choice is saved to the
 * profile so it follows the account, and the `themeAsked` flag keeps the
 * prompt to a single appearance.
 */
export function ThemeChoiceDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(() => !hasChosenTheme())
  const [busy, setBusy] = useState(false)

  async function choose(theme: Theme) {
    if (busy) return
    setBusy(true)
    applyTheme(theme)
    markThemeChosen()
    setOpen(false)
    try {
      await setProfileTheme(userId, theme)
    } catch {
      // Applies on this device regardless; the account copy syncs on a later visit.
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div aria-hidden className="absolute inset-0 bg-scrim backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-choice-title"
        className="relative w-full max-w-sm"
      >
        <Card className="p-6 text-center sm:p-8" glow>
          <span className="accent-gradient mx-auto grid size-12 place-items-center rounded-2xl text-on-accent">
            <Sun size={22} />
          </span>
          <h2 id="theme-choice-title" className="mt-5 text-xl font-semibold tracking-tight">
            Pick your look
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-mist-400">
            Choose how TrustPass appears — you can change this anytime in Settings.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => choose('light')}
              disabled={busy}
              className="focus-ring rounded-2xl border border-white/10 bg-white/4 p-3.5 text-left transition hover:border-accent-500/40 hover:bg-white/8 disabled:opacity-60"
            >
              <span className="block h-12 w-full rounded-lg border border-slate-300 bg-[#f2f8f9]" />
              <span className="mt-3 flex items-center gap-1.5 text-sm font-medium">
                <Sun size={14} className="text-mist-300" />
                Light
              </span>
            </button>
            <button
              type="button"
              onClick={() => choose('dark')}
              disabled={busy}
              className="focus-ring rounded-2xl border border-white/10 bg-white/4 p-3.5 text-left transition hover:border-accent-500/40 hover:bg-white/8 disabled:opacity-60"
            >
              <span className="block h-12 w-full rounded-lg border border-white/10 bg-[#0c2633]" />
              <span className="mt-3 flex items-center gap-1.5 text-sm font-medium">
                <Moon size={14} className="text-mist-300" />
                Dark
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              markThemeChosen()
              setOpen(false)
            }}
            className="focus-ring mt-4 text-xs text-mist-500 transition hover:text-mist-300"
          >
            Decide later — I'll change it in Settings
          </button>
        </Card>
      </div>
    </div>
  )
}
