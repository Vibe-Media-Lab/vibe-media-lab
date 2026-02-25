'use client'

import type { LoadingStep } from '@/lib/stores/myeongpan-store'

const STEPS: { key: LoadingStep; label: string }[] = [
  { key: 'calculating', label: '차트 계산 중...' },
  { key: 'interpreting', label: '통합 풀이 생성 중...' },
]

export function LoadingIndicator({ currentStep }: { currentStep: LoadingStep | null }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-8 h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[var(--color-neon-lime)]" />
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex
          const isCurrent = i === currentIndex

          return (
            <div key={step.key} className="flex items-center gap-3">
              {isDone ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-neon-lime)] text-xs text-black">
                  &#10003;
                </span>
              ) : isCurrent ? (
                <span className="h-5 w-5 animate-pulse rounded-full bg-white/20" />
              ) : (
                <span className="h-5 w-5 rounded-full bg-white/5" />
              )}
              <span
                className={`text-sm ${
                  isCurrent ? 'text-white' : isDone ? 'text-white/50' : 'text-white/30'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
