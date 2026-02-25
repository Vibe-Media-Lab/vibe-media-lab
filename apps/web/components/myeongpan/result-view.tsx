'use client'

import type { UnifiedChart, InterpretationResult } from '@vibe-media-lab/myeongpan-core'
import { useMyeongpanStore } from '@/lib/stores/myeongpan-store'
import { ResultSummary } from './result-summary'
import { ChartTabGroup } from './chart-tab-group'
import { CtaSection } from './cta-section'
import { InterpretationOptions } from './interpretation-options'

interface ResultViewProps {
  chart: UnifiedChart
  chartId: string
  interpretation: InterpretationResult | null
}

export function ResultView({ chart, chartId, interpretation }: ResultViewProps) {
  const { reinterpret, reset, loadingStep } = useMyeongpanStore()
  const isReinterpreting = loadingStep === 'interpreting'

  return (
    <div className="space-y-6">
      {/* 요약 */}
      <ResultSummary chart={chart} interpretation={interpretation} />

      {/* 탭 차트 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <ChartTabGroup key={chartId} chart={chart} interpretation={interpretation} />
      </div>

      {/* CTA */}
      <CtaSection chartId={chartId} />

      {/* 다시 풀이 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-sm font-medium text-white/80">풀이 옵션 변경</h3>
        <InterpretationOptions />
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={reinterpret}
            disabled={isReinterpreting}
            className="rounded-lg bg-[var(--color-neon-lime)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isReinterpreting ? '풀이 생성 중...' : '다시 풀이'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/50 transition-colors hover:bg-white/10"
          >
            새로 입력
          </button>
        </div>
      </div>
    </div>
  )
}
