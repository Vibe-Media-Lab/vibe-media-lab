import { SiteHeader } from '@/components/shared/site-header'
import { SiteFooter } from '@/components/shared/site-footer'

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
