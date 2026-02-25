'use client'

import type { WesternChart } from '@vibe-media-lab/myeongpan-core'

function Big3Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

export function TabWestern({ chart }: { chart: WesternChart | null }) {
  if (!chart) {
    return (
      <div className="py-12 text-center text-sm text-white/40">
        출생시간이 필요한 체계입니다. 시간을 입력하면 분석할 수 있습니다.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Big 3 */}
      <div className="grid grid-cols-3 gap-3">
        <Big3Card label="태양" value={chart.sunSign} />
        <Big3Card label="달" value={chart.moonSign} />
        <Big3Card label="상승" value={chart.risingSign} />
      </div>

      {/* 행성 위치 */}
      <div>
        <h4 className="mb-2 text-xs text-white/50">행성 배치</h4>
        <div className="space-y-1.5">
          {chart.planets.map((planet, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-white/70">
                {planet.name}
                {planet.isRetrograde && (
                  <span className="ml-1 text-xs text-orange-400">R</span>
                )}
              </span>
              <span className="text-white/50">
                {planet.sign} {planet.degree}&deg;{planet.minute}&apos;
              </span>
              <span className="text-white/30 text-xs">{planet.house}H</span>
            </div>
          ))}
        </div>
      </div>

      {/* 주요 애스펙트 */}
      {chart.aspects.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs text-white/50">주요 애스펙트</h4>
          <div className="space-y-1">
            {chart.aspects
              .filter((a) => a.strength >= 0.5)
              .slice(0, 10)
              .map((aspect, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                  <span>{aspect.body1}</span>
                  <span className="text-white/40">{aspect.symbol}</span>
                  <span>{aspect.body2}</span>
                  <span className="ml-auto text-white/30">
                    {aspect.type} ({aspect.orb.toFixed(1)}&deg;)
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 원소/양식 분포 */}
      <div className="grid grid-cols-2 gap-4">
        {chart.elements && Object.keys(chart.elements).length > 0 && (
          <div>
            <h4 className="mb-1 text-xs text-white/50">원소 분포</h4>
            {Object.entries(chart.elements).map(([el, planets]) => (
              <div key={el} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-white/60">{el}</span>
                <span className="text-white/40">{(planets as string[]).join(', ')}</span>
              </div>
            ))}
          </div>
        )}
        {chart.modalities && Object.keys(chart.modalities).length > 0 && (
          <div>
            <h4 className="mb-1 text-xs text-white/50">양식 분포</h4>
            {Object.entries(chart.modalities).map(([mod, planets]) => (
              <div key={mod} className="flex items-center gap-2 text-xs">
                <span className="w-12 text-white/60">{mod}</span>
                <span className="text-white/40">{(planets as string[]).join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 패턴 */}
      {chart.patterns && chart.patterns.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs text-white/50">차트 패턴</h4>
          <div className="flex flex-wrap gap-2">
            {chart.patterns.map((p, i) => (
              <span key={i} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
