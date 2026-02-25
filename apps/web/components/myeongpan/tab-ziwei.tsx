'use client'

import type { ZiweiChart, ZiweiPalace } from '@vibe-media-lab/myeongpan-core'

/** 핵심 7궁 (명/신/부처/관록/재백/복덕/천이) */
const KEY_PALACES = ['命宮', '身宮', '夫妻宮', '官祿宮', '財帛宮', '福德宮', '遷移宮']
const PALACE_LABELS: Record<string, string> = {
  '命宮': '명궁',
  '身宮': '신궁',
  '夫妻宮': '부처궁',
  '官祿宮': '관록궁',
  '財帛宮': '재백궁',
  '福德宮': '복덕궁',
  '遷移宮': '천이궁',
}

function findKeyPalaces(palaces: ZiweiPalace[]): ZiweiPalace[] {
  // name에서 한자 기반 매칭 또는 영어 키 매칭
  return palaces.filter((p) => {
    const n = p.name
    return (
      KEY_PALACES.includes(n) ||
      n.includes('命') ||
      n.includes('身') ||
      n.includes('夫妻') ||
      n.includes('官') ||
      n.includes('財') ||
      n.includes('福德') ||
      n.includes('遷')
    )
  })
}

function PalaceCard({ palace }: { palace: ZiweiPalace }) {
  const label = PALACE_LABELS[palace.name] ?? palace.name

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">{label}</h4>
        <span className="text-xs text-white/40">{palace.earthlyBranch}</span>
      </div>
      {/* 주성 */}
      {palace.majorStars.length > 0 && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-1">
            {palace.majorStars.map((star, i) => (
              <span
                key={i}
                className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80"
              >
                {star.name}
                {star.brightness && (
                  <span className="ml-1 text-white/40">{star.brightness}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* 부성 */}
      {palace.minorStars.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {palace.minorStars.slice(0, 4).map((star, i) => (
            <span key={i} className="text-[10px] text-white/40">
              {star.name}
            </span>
          ))}
          {palace.minorStars.length > 4 && (
            <span className="text-[10px] text-white/30">
              +{palace.minorStars.length - 4}
            </span>
          )}
        </div>
      )}
      {/* 대한 */}
      {palace.decadal && (
        <div className="mt-2 text-[10px] text-white/30">
          대한: {palace.decadal.range[0]}-{palace.decadal.range[1]}세
        </div>
      )}
    </div>
  )
}

export function TabZiwei({ chart }: { chart: ZiweiChart | null }) {
  if (!chart) {
    return (
      <div className="py-12 text-center text-sm text-white/40">
        출생시간이 필요한 체계입니다. 시간을 입력하면 분석할 수 있습니다.
      </div>
    )
  }

  const keyPalaces = findKeyPalaces(chart.palaces)
  const displayPalaces = keyPalaces.length > 0 ? keyPalaces : chart.palaces.slice(0, 7)

  return (
    <div className="space-y-4">
      {/* 기본 정보 */}
      <div className="flex flex-wrap gap-3 text-sm text-white/60">
        <span>오행국: {chart.fiveElementsClass}</span>
        <span>명주: {chart.soul}</span>
        <span>신주: {chart.body}</span>
      </div>

      {/* 핵심 궁 카드 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {displayPalaces.map((palace, i) => (
          <PalaceCard key={i} palace={palace} />
        ))}
      </div>
    </div>
  )
}
