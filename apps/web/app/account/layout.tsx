'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { SiteHeader } from '@/components/shared'
import { SettingsSidebar } from '@/components/settings'
import { Spinner } from '@/components/ui/spinner'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!data.user) {
          router.push('/login?redirect=/account')
          return
        }
        setUser(data.user)
      } catch {
        router.push('/login?redirect=/account')
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.push('/login?redirect=/account')
        } else {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'User'

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <SiteHeader />
      <div className="flex flex-1 px-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40">
        <SettingsSidebar userName={displayName} onSignOut={handleSignOut} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
