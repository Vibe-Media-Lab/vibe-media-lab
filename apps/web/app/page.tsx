import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SiteHeader, SiteFooter } from '@/components/shared'
import {
  TemplateCarousel,
  ToolsSection,
  TrendingSection,
} from '@/components/showcase'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden py-16 px-4 sm:px-6 sm:py-24 lg:px-12 xl:px-16">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-neon-pink)]/10 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--color-neon-cyan)]/5 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Make It{' '}
              <span className="bg-gradient-to-r from-[var(--color-neon-pink)] via-[var(--color-neon-purple)] to-[var(--color-neon-cyan)] bg-clip-text text-transparent">
                Go Viral
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
              검증된 바이럴 콘텐츠 포맷을 AI 자동화 워크플로우로.
              <br className="hidden sm:block" />
              틱톡, 릴스, 쇼츠 — 클릭 한 번이면 끝.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="bg-[var(--color-neon-pink)] text-white hover:bg-[var(--color-neon-pink)]/90 px-8"
              >
                <Link href="/signup">무료로 시작하기</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/templates">템플릿 둘러보기</Link>
              </Button>
            </div>
          </div>
        </section>

        <TemplateCarousel />

        <ToolsSection />

        <TrendingSection />

        <section className="border-t border-white/10 py-16 px-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to go viral?
            </h2>
            <p className="mt-4 text-white/60">
              지금 바로 시작하고 첫 바이럴 콘텐츠를 만들어보세요.
            </p>
            <Button
              size="lg"
              asChild
              className="mt-8 bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-cyan)] text-white hover:opacity-90 px-8"
            >
              <Link href="/signup">Start Creating — It&apos;s Free</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
