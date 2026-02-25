'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMyeongpanStore } from '@/lib/stores/myeongpan-store'
import { BirthForm } from '@/components/myeongpan/birth-form'
import { LoadingIndicator } from '@/components/myeongpan/loading-indicator'
import { ResultView } from '@/components/myeongpan/result-view'
import { SavedChartsList } from '@/components/myeongpan/saved-charts-list'

export default function MyeongpanPage() {
  const searchParams = useSearchParams()
  const { phase, loadingStep, chart, chartId, interpretation, error, loadChart, reset } =
    useMyeongpanStore()

  // URL chartId → 바로 결과 로딩 (UUID 검증)
  useEffect(() => {
    const urlChartId = searchParams.get('chartId')
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (urlChartId && UUID_RE.test(urlChartId) && phase === 'form') {
      loadChart(urlChartId)
    }
  }, [searchParams, phase, loadChart])

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">명판</h1>
      <p className="mb-8 text-sm text-white/50">
        사주 &middot; 자미두수 &middot; 서양점성술 3체계 통합 분석
      </p>

      {phase === 'form' && (
        <>
          <SavedChartsList />
          <BirthForm />
        </>
      )}

      {phase === 'loading' && <LoadingIndicator currentStep={loadingStep} />}

      {phase === 'result' && chart && chartId && (
        <ResultView chart={chart} chartId={chartId} interpretation={interpretation} />
      )}

      {phase === 'error' && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="mb-4 text-sm text-red-400">{error ?? '오류가 발생했습니다.'}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/15"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  )
}
