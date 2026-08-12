import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  Fingerprint,
  LayoutDashboard,
  LifeBuoy,
  Radio,
  Settings,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { DevicesMiniPanel, SecurityScoreCard } from './SecurityPanel'

type AccountType = 'personal' | 'business'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  businessOnly?: boolean
  personalOnly?: boolean
}

const primaryNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, personalOnly: true },
  { to: '/vault', label: 'Vault', icon: ShieldCheck, businessOnly: true },
  { to: '/passkeys', label: 'Passkeys', icon: Fingerprint },
  { to: '/devices', label: 'Devices', icon: Smartphone },
  { to: '/security-feed', label: 'Security Feed', icon: Radio },
]

const secondaryNav: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/support', label: 'Support', icon: LifeBuoy },
]

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'focus-ring flex items-center gap-3 rounded-full px-4 py-3 text-sm transition',
          isActive
            ? 'accent-gradient font-semibold text-on-accent'
            : 'text-mist-300 hover:bg-white/6 hover:text-mist-50',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <img
        src="/trustpass-logo.png"
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-lg object-cover"
      />
      <span className="text-lg font-semibold tracking-tight">TrustPass</span>
    </div>
  )
}

export function SidebarContent({
  accountType,
  lastSignIn,
  onNavigate,
}: {
  accountType: AccountType
  lastSignIn?: string | null
  onNavigate?: () => void
}) {
  const items = primaryNav.filter(
    (item) =>
      (!item.businessOnly || accountType === 'business') &&
      (!item.personalOnly || accountType === 'personal'),
  )

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="pt-3">
        <Wordmark />
      </div>

      <nav className="flex flex-col gap-1.5">
        {items.map((item) => (
          <NavRow key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* min-h-0 is what lets this scroll instead of pushing the footer nav out. */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        <SecurityScoreCard lastSignIn={lastSignIn} />
        <DevicesMiniPanel onNavigate={onNavigate} />
      </div>

      <nav className="flex flex-col gap-1.5">
        {secondaryNav.map((item) => (
          <NavRow key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  )
}

/** Desktop rail. Hidden below `lg`, where the drawer in AppShell takes over. */
export function Sidebar({
  accountType,
  lastSignIn,
}: {
  accountType: AccountType
  lastSignIn?: string | null
}) {
  return (
    <aside className="glass-card hidden w-64 shrink-0 lg:block">
      <SidebarContent accountType={accountType} lastSignIn={lastSignIn} />
    </aside>
  )
}
