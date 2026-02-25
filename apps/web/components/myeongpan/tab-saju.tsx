'use client'

import type { SajuChart, FiveElement } from '@vibe-media-lab/myeongpan-core'

const ELEMENT_COLORS: Record<FiveElement, string> = {
  '목': 'bg-green-600',
  '화': 'bg-red-600',
  '토': 'bg-yellow-600',
  '금': 'bg-gray-400',
  '수': 'bg-blue-600',
}

const PILLAR_LABELS = ['연주', '월주', '일주', '시주']

export function TabSaju({ chart }: { chart: SajuChart }) {
  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
  const elements = chart.fiveElements
  const yinYang = chart.yinYangBalance
  const total = yinYang.양 + yinYang.음
  const elementTotal = Object.values(elements).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* 사주 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead>
            <tr className="text-white/50">
              {PILLAR_LABELS.map((l) => (
                <th key={l} className="px-3 py-2 font-normal">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 천간 */}
            <tr>
              {pillars.map((p, i) => (
                <td key={`stem-${i}`} className="px-3 py-2">
                  {p ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg font-semibold text-white">{p.stem}</span>
                      <span className="text-xs text-white/50">
                        {p.stemElement} {p.stemYinYang}
                      </span>
                    </div>
                  ) : (
                    <span className="text-white/30">-</span>
                  )}
                </td>
              ))}
            </tr>
            {/* 지지 */}
            <tr className="border-t border-white/5">
              {pillars.map((p, i) => (
                <td key={`branch-${i}`} className="px-3 py-2">
                  {p ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg font-semibold text-white">{p.branch}</span>
                      <span className="text-xs text-white/50">
                        {p.branchElement} {p.branchYinYang}
                      </span>
                    </div>
                  ) : (
                    <span className="text-white/30">-</span>
                  )}
                </td>
              ))}
            </tr>
            {/* 한자 */}
            <tr className="border-t border-white/5">
              {pillars.map((p, i) => (
                <td key={`hanja-${i}`} className="px-3 py-2 text-white/40">
                  {p ? p.hanja : '-'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 오행 분포 바 */}
      <div>
        <h4 className="mb-2 text-xs text-white/50">오행 분포</h4>
        <div className="flex h-4 overflow-hidden rounded-full">
          {(Object.entries(elements) as [FiveElement, number][]).map(([el, count]) =>
            count > 0 ? (
              <div
                key={el}
                className={`${ELEMENT_COLORS[el]} flex items-center justify-center text-[10px] font-medium text-white`}
                style={{ width: `${(count / elementTotal) * 100}%` }}
              >
                {el}
              </div>
            ) : null
          )}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-white/40">
          {(Object.entries(elements) as [FiveElement, number][]).map(([el, count]) => (
            <span key={el}>
              {el} {count}
            </span>
          ))}
        </div>
      </div>

      {/* 음양 바 */}
      <div>
        <h4 className="mb-2 text-xs text-white/50">음양 균형</h4>
        <div className="flex h-4 overflow-hidden rounded-full">
          <div
            className="flex items-center justify-center bg-amber-500 text-[10px] font-medium text-black"
            style={{ width: `${total > 0 ? (yinYang.양 / total) * 100 : 50}%` }}
          >
            양 {yinYang.양}
          </div>
          <div
            className="flex items-center justify-center bg-indigo-500 text-[10px] font-medium text-white"
            style={{ width: `${total > 0 ? (yinYang.음 / total) * 100 : 50}%` }}
          >
            음 {yinYang.음}
          </div>
        </div>
      </div>

      {/* 음력/보정시간 */}
      {(chart.lunarDate || chart.correctedTime) && (
        <div className="text-xs text-white/40">
          {chart.lunarDate && (
            <p>
              음력: {chart.lunarDate.year}년 {chart.lunarDate.month}월 {chart.lunarDate.day}일
              {chart.lunarDate.isLeapMonth && ' (윤달)'}
            </p>
          )}
          {chart.correctedTime && (
            <p>
              경도보정 시간: {String(chart.correctedTime.hour).padStart(2, '0')}:
              {String(chart.correctedTime.minute).padStart(2, '0')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
