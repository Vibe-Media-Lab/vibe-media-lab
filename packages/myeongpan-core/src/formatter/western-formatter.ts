/**
 * 서양 점성술 포매터
 *
 * WesternChart → LLM 입력 텍스트 (~300 토큰)
 * Big 3 + 내행성(Mercury~Mars) + 외행성(Jupiter~Saturn)
 * 주요 애스펙트(최대 8개) + 패턴 + 원소/양식 분포
 */

import type { WesternChart, WesternPlanet, WesternAspect } from '../types.js'

/** 출력할 행성 (최대 7개) */
const KEY_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const

/** 행성 한국어 이름 */
const PLANET_NAME_KO: Record<string, string> = {
  Sun: '태양(Sun)',
  Moon: '달(Moon)',
  Mercury: '수성(Mercury)',
  Venus: '금성(Venus)',
  Mars: '화성(Mars)',
  Jupiter: '목성(Jupiter)',
  Saturn: '토성(Saturn)',
  Uranus: '천왕성(Uranus)',
  Neptune: '해왕성(Neptune)',
  Pluto: '명왕성(Pluto)',
  Ascendant: '상승점(ASC)',
}

/** 애스펙트 최대 개수 */
const MAX_ASPECTS = 8

function formatPlanet(planet: WesternPlanet): string {
  const ko = PLANET_NAME_KO[planet.name] || planet.name
  const retro = planet.isRetrograde ? ' ℞' : ''
  const dignity = planet.dignity.state !== 'neutral' ? ` — ${planet.dignity.state}` : ''
  return `- ${ko}: ${planet.sign} ${planet.degree}°${planet.minute}'${retro} (${planet.house}하우스${dignity})`
}

function formatAspect(aspect: WesternAspect): string {
  const b1 = PLANET_NAME_KO[aspect.body1] || aspect.body1
  const b2 = PLANET_NAME_KO[aspect.body2] || aspect.body2
  const applying = aspect.isApplying ? '접근중' : '분리중'
  return `- ${b1} ${aspect.symbol} ${b2}: ${aspect.type} (orb ${aspect.orb.toFixed(1)}°, ${applying})`
}

export function formatWestern(chart: WesternChart): string {
  const lines: string[] = []

  lines.push('## 서양 점성술 분석')
  lines.push('')

  // Big 3
  lines.push('### Big 3')
  lines.push(`태양: ${chart.sunSign} | 달: ${chart.moonSign} | 상승: ${chart.risingSign}`)

  // 주요 행성
  lines.push('')
  lines.push('### 행성 배치')

  for (const name of KEY_PLANETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (planet) lines.push(formatPlanet(planet))
  }

  // 주요 애스펙트 (strength 기준 상위, 최대 8개)
  const sortedAspects = [...chart.aspects]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, MAX_ASPECTS)

  if (sortedAspects.length > 0) {
    lines.push('')
    lines.push('### 주요 애스펙트')
    for (const aspect of sortedAspects) {
      lines.push(formatAspect(aspect))
    }
  }

  // 패턴
  if (chart.patterns.length > 0) {
    lines.push('')
    lines.push(`### 패턴: ${chart.patterns.join(', ')}`)
  }

  // 원소/양식 분포
  lines.push('')
  lines.push('### 원소/양식 분포')
  for (const [element, planets] of Object.entries(chart.elements)) {
    if (planets.length > 0) {
      lines.push(`${element}: ${planets.join(', ')} (${planets.length}개)`)
    }
  }
  for (const [modality, planets] of Object.entries(chart.modalities)) {
    if (planets.length > 0) {
      lines.push(`${modality}: ${planets.join(', ')} (${planets.length}개)`)
    }
  }

  return lines.join('\n')
}
