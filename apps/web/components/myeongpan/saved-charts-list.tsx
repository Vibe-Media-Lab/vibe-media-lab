'use client'

import { useEffect, useState } from 'react'
import { useMyeongpanStore } from '@/lib/stores/myeongpan-store'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const SYSTEM_LABELS: Record<string, string> = {
  saju: '사주',
  ziwei: '자미',
  western: '서양',
}

export function SavedChartsList() {
  const { savedCharts, loadSavedCharts, loadChart, deleteChart } = useMyeongpanStore()
  const [isOpen, setIsOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadSavedCharts()
  }, [loadSavedCharts])

  if (!savedCharts || savedCharts.length === 0) return null

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 text-sm text-white/50 hover:text-white/70"
      >
        내 명판 기록 ({savedCharts.length})
        <span className="ml-1">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {isOpen && (
        <div className="space-y-2">
          {savedCharts.map((chart) => (
            <div
              key={chart.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <button
                type="button"
                onClick={() => loadChart(chart.id)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">
                    {chart.placeName ?? '알 수 없음'} &middot;{' '}
                    {chart.gender === 'male' ? '남' : '여'}
                  </span>
                  <div className="flex gap-1">
                    {chart.systemsCompleted.map((sys) => (
                      <span
                        key={sys}
                        className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50"
                      >
                        {SYSTEM_LABELS[sys] ?? sys}
                      </span>
                    ))}
                    {chart.hasInterpretation && (
                      <span className="rounded bg-[var(--color-neon-lime)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-neon-lime)]">
                        풀이
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-0.5 text-xs text-white/30">
                  {new Date(chart.createdAt).toLocaleDateString('ko-KR')}
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setPendingDeleteId(chart.id)
                }}
                className="ml-3 text-xs text-white/30 hover:text-red-400"
                aria-label="삭제"
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
        title="명판 삭제"
        description="이 명판을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!pendingDeleteId) return
          setIsDeleting(true)
          try {
            await deleteChart(pendingDeleteId)
          } finally {
            setIsDeleting(false)
            setPendingDeleteId(null)
          }
        }}
      />
    </div>
  )
}
