'use client'

import { useState } from 'react'
import type { UnifiedChart, InterpretationResult } from '@vibe-media-lab/myeongpan-core'
import { TabSaju } from './tab-saju'
import { TabZiwei } from './tab-ziwei'
import { TabWestern } from './tab-western'
import { TabInterpretation } from './tab-interpretation'

interface Tab {
  id: string
  label: string
  enabled: boolean
}

interface ChartTabGroupProps {
  chart: UnifiedChart
  interpretation: InterpretationResult | null
}

export function ChartTabGroup({ chart, interpretation }: ChartTabGroupProps) {
  const tabs: Tab[] = [
    { id: 'saju', label: '사주', enabled: !!chart.saju },
    { id: 'ziwei', label: '자미두수', enabled: !!chart.ziwei },
    { id: 'western', label: '서양점성', enabled: !!chart.western },
    { id: 'interpretation', label: '통합 풀이', enabled: !!interpretation },
  ]

  const firstEnabled = tabs.find((t) => t.enabled)?.id ?? 'saju'
  const [activeTab, setActiveTab] = useState(firstEnabled)

  return (
    <div>
      {/* 탭 바 */}
      <div role="tablist" aria-label="차트 분석 탭" className="flex border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-disabled={!tab.enabled}
            tabIndex={tab.enabled ? 0 : -1}
            onClick={() => tab.enabled && setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-[var(--color-neon-lime)] text-white'
                : tab.enabled
                  ? 'text-white/50 hover:text-white/70'
                  : 'cursor-not-allowed text-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 패널 */}
      <div role="tabpanel" className="py-6">
        {activeTab === 'saju' && chart.saju && <TabSaju chart={chart.saju} />}
        {activeTab === 'ziwei' && <TabZiwei chart={chart.ziwei} />}
        {activeTab === 'western' && <TabWestern chart={chart.western} />}
        {activeTab === 'interpretation' && (
          <TabInterpretation interpretation={interpretation} />
        )}
      </div>
    </div>
  )
}
