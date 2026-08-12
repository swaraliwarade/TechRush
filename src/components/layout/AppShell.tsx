import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AuroraBackground } from '@/components/motion/AuroraBackground'
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
  const location = useLocation()

  return (
    <div className="relative min-h-dvh p-3 sm:p-5 lg:p-6">
      <AuroraBackground />

      <div className="glass-card relative mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1600px] gap-5 p-3 sm:min-h-[calc(100dvh-2.5rem)] sm:p-5">
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-scrim backdrop-blur-sm"
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
