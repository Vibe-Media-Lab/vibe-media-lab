import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/shared'

export default async function LibraryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase not configured yet
  }

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />
      <main className="px-4 py-8 sm:px-6 lg:px-24 xl:px-32 2xl:px-40">
        {children}
      </main>
    </div>
  )
}
