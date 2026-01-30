import { Suspense } from 'react'
import { TemplatesPageContent } from './templates-page-content'

export const metadata = {
  title: 'Templates | VIBE Media Lab',
  description: '검증된 바이럴 포맷으로 쉽고 빠르게 영상을 만들어보세요',
}

function TemplatesSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[9/16] rounded-2xl bg-white/10 animate-pulse"
        />
      ))}
    </div>
  )
}

export default function TemplatesPage() {
  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold sm:text-4xl">
            <span className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-cyan)] bg-clip-text text-transparent">
              Viral Templates
            </span>
          </h1>
          <p className="mt-2 text-white/60">
            검증된 바이럴 포맷으로 쉽고 빠르게 영상을 만들어보세요
          </p>
        </header>

        <Suspense fallback={<TemplatesSkeleton />}>
          <TemplatesPageContent />
        </Suspense>
      </div>
    </main>
  )
}
