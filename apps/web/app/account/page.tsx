'use client'

import * as React from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { AccountContent } from '@/components/settings'
import { Spinner } from '@/components/ui/spinner'

export default function AccountPage() {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        setUser(data.user)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <AccountContent user={user} />
}
