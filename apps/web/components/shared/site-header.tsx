'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { ProfileDropdown } from '@/components/shared/profile-dropdown'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/explore', label: 'Explore' },
  { href: '/templates', label: 'Templates' },
  { href: '/pricing', label: 'Pricing' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null

    const initAuth = async () => {
      try {
        const supabase = createClient()

        const { data } = await supabase.auth.getUser()
        setUser(data.user)

        const { data: authData } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            setUser(session?.user ?? null)
          }
        )
        subscription = authData.subscription
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <nav
        className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold text-white">
            VIBE
          </Link>
          <div className="hidden items-center gap-6 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm transition-colors',
                  pathname.startsWith(item.href)
                    ? 'text-white'
                    : 'text-white/60 hover:text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                asChild
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Link href="/studio">Studio</Link>
              </Button>
              <ProfileDropdown user={user} />
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                asChild
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
                  로그인
                </Link>
              </Button>
              <Button
                asChild
                className="bg-[var(--color-neon-pink)] text-white hover:bg-[var(--color-neon-pink)]/90"
              >
                <Link href={`/signup?redirect=${encodeURIComponent(pathname)}`}>
                  Start Creating
                </Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
