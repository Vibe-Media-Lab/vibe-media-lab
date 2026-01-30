'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User as UserIcon, Settings, Users, LogOut, ChevronRight } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'

interface ProfileDropdownProps {
  user: User
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsOpen(false)
    router.refresh()
  }

  // Mock data - replace with actual data from user profile/credits
  const credits = {
    used: 32,
    total: 100,
    percentage: 68,
  }
  const plan = 'Free Plan'

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const avatarUrl = user.user_metadata?.avatar_url
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Avatar size="sm" className="cursor-pointer ring-2 ring-transparent hover:ring-white/20">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-[var(--color-neon-pink)] to-[var(--color-neon-cyan)] text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right"
          role="menu"
        >
          <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-1 shadow-xl shadow-black/50">
            {/* Credits Section */}
            <div className="px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">
                  {credits.percentage}% credits left
                </span>
                <ChevronRight className="h-4 w-4 text-white/40" />
              </div>
              <Progress
                value={credits.percentage}
                className="mt-2 h-1.5 bg-white/20"
              />
            </div>

            {/* Plan Section */}
            <div className="flex items-center justify-between border-t border-white/10 px-3 py-3">
              <span className="text-sm text-white/60">{plan}</span>
              <Link
                href="/pricing"
                className="text-sm font-medium text-[var(--color-neon-green)] hover:underline"
                onClick={() => setIsOpen(false)}
              >
                Upgrade
              </Link>
            </div>

            {/* Menu Items */}
            <div className="border-t border-white/10 py-1">
              <DropdownItem
                href="/account"
                icon={<UserIcon className="h-4 w-4" />}
                onClick={() => setIsOpen(false)}
              >
                View profile
              </DropdownItem>
              <DropdownItem
                href="/account"
                icon={<Settings className="h-4 w-4" />}
                onClick={() => setIsOpen(false)}
              >
                Manage account
              </DropdownItem>
              <DropdownItem
                href="https://discord.gg/vibe"
                icon={<Users className="h-4 w-4" />}
                external
                onClick={() => setIsOpen(false)}
              >
                Join our community
              </DropdownItem>
            </div>

            {/* Sign Out */}
            <div className="border-t border-white/10 py-1">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  external?: boolean
  onClick?: () => void
}

function DropdownItem({ href, icon, children, external, onClick }: DropdownItemProps) {
  const linkProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
      role="menuitem"
      onClick={onClick}
      {...linkProps}
    >
      {icon}
      {children}
    </Link>
  )
}
