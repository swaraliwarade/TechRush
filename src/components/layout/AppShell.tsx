import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Sidebar, SidebarContent } from './Sidebar'
import { TopBar } from './TopBar'

type AppShellProps = {
  greeting: ReactNode
  subtitle: string
  userName: string
  userEmail: string
  accountType: 'personal' | 'business'
  lastSignIn?: string | null
  onSignOut: () => void
  children: ReactNode
}

export function AppShell({
  greeting,
  subtitle,
  userName,
  userEmail,
  accountType,
  lastSignIn,
  onSignOut,
  children,
}: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-dvh p-3 sm:p-5 lg:p-6">
      <div className="glass-card mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1400px] gap-5 p-3 sm:min-h-[calc(100dvh-2.5rem)] sm:p-5">
        <Sidebar accountType={accountType} lastSignIn={lastSignIn} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <TopBar
            greeting={greeting}
            subtitle={subtitle}
            userName={userName}
            userEmail={userEmail}
            onOpenNav={() => setNavOpen(true)}
            onSignOut={onSignOut}
          />
          <main className="flex-1">{children}</main>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
          />
          <div className="glass-card absolute top-3 bottom-3 left-3 w-64 bg-ink-900/95">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="focus-ring absolute top-4 right-3 grid size-9 place-items-center rounded-full text-mist-400"
            >
              <X size={18} />
            </button>
            <SidebarContent
              accountType={accountType}
              lastSignIn={lastSignIn}
              onNavigate={() => setNavOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
