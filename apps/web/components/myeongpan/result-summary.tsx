'use client'

import type { UnifiedChart, InterpretationResult } from '@vibe-media-lab/myeongpan-core'

const SYSTEM_LABELS: Record<string, string> = {
  saju: '사주',
  ziwei: '자미두수',
  western: '서양점성',
}

interface ResultSummaryProps {
  chart: UnifiedChart
  interpretation: InterpretationResult | null
}

export function ResultSummary({ chart, interpretation }: ResultSummaryProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      {/* 체계 뱃지 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {chart.meta.systemsCompleted.map((sys) => (
          <span
            key={sys}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70"
          >
            {SYSTEM_LABELS[sys] ?? sys}
          </span>
        ))}
      </div>

      {/* 요약 */}
      {interpretation ? (
        <>
          <p className="mb-4 text-base leading-relaxed text-white/90">
            {interpretation.summary}
          </p>
          {interpretation.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {interpretation.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="rounded-full border border-[var(--color-neon-lime)]/30 px-2.5 py-0.5 text-xs text-[var(--color-neon-lime)]"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-white/50">
          차트가 계산되었지만 풀이를 생성하지 못했습니다.
          &quot;다시 풀이&quot; 버튼으로 재시도할 수 있습니다.
        </p>
      )}
    </div>
  )
}
