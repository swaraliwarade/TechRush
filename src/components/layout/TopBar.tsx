import { Bell, LogOut, Menu, Search } from 'lucide-react'
import type { ReactNode } from 'react'

type TopBarProps = {
  greeting: ReactNode
  subtitle: string
  userName: string
  userEmail: string
  onOpenNav: () => void
  onSignOut: () => void
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="focus-ring grid size-10 place-items-center rounded-full border border-white/8 bg-white/5 text-mist-300 transition hover:text-mist-50"
    >
      {children}
    </button>
  )
}

export function TopBar({
  greeting,
  subtitle,
  userName,
  userEmail,
  onOpenNav,
  onSignOut,
}: TopBarProps) {
  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="focus-ring grid size-10 shrink-0 place-items-center rounded-full border border-white/8 bg-white/5 text-mist-300 lg:hidden"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-display truncate text-2xl leading-none sm:text-3xl">
            {greeting}
          </h1>
          <p className="truncate text-sm text-mist-400">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2.5 text-sm text-mist-400 md:flex lg:w-72">
          <Search size={16} />
          <span>Search account activity</span>
        </div>
        <IconButton label="Notifications">
          <Bell size={18} />
        </IconButton>
        <IconButton label="Sign out" onClick={onSignOut}>
          <LogOut size={18} />
        </IconButton>
        <div className="flex items-center gap-3">
          <span className="accent-gradient grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-on-accent">
            {initials || 'TP'}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-mist-400">{userEmail}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
