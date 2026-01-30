'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Tag, Gift, CreditCard, Building2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const accountItems = [
  { href: '/account', label: 'Account', icon: User },
  { href: '/account/promocode', label: 'Promocode', icon: Tag },
  { href: '/account/gifts', label: 'Gifts', icon: Gift },
]

const workspaceItems = [
  { href: '/account/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/account/workspace', label: 'Manage workspace', icon: Building2 },
]

interface SettingsSidebarProps {
  userName: string
  onSignOut: () => void
}

export function SettingsSidebar({ userName, onSignOut }: SettingsSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex w-64 flex-col border-r border-white/10 bg-[#0a0a0a]">
      <div className="flex-1 overflow-y-auto p-4">
        {/* User Name */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[var(--color-neon-lime)]" />
          <span className="truncate text-sm font-medium text-white">
            {userName}
          </span>
        </div>

        {/* Account Settings */}
        <div className="mb-6">
          <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-white/40">
            Account settings
          </h3>
          <nav className="space-y-1">
            {accountItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Workspace */}
        <div>
          <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-white/40">
            Workspace
          </h3>
          <nav className="space-y-1">
            {workspaceItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-white/10 p-4">
        {/* Discord Card */}
        <div className="mb-4 rounded-xl bg-[#1a1a1a] p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865F2]">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-white"
              fill="currentColor"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <h4 className="mb-1 text-sm font-medium text-white">
            Join our Discord
          </h4>
          <p className="mb-3 text-xs text-white/60">
            Connect with community, and share your work!
          </p>
          <a
            href="https://discord.gg/vibe"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-white/10 py-2 text-center text-sm text-white transition-colors hover:bg-white/20"
          >
            Join now
          </a>
        </div>

        {/* Sign Out */}
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
