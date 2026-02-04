import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/shared/logout-button'

export default async function DashboardLayout({
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
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/studio" className="font-semibold">
              Vibe Media Lab
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/gallery"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Gallery
              </Link>
              <Link
                href="/history"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                History
              </Link>
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/library"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Library
            </Link>
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
        {children}
      </main>
    </div>
  )
}
