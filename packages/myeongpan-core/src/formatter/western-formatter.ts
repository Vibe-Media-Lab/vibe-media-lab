/**
 * 서양 점성술 포매터
 *
 * WesternChart → LLM 입력 텍스트 (~550 토큰)
 * 앵글 + Big 3 + 전행성(Sun~Chiron) + 교점
 * 12 하우스 커스프 + 주요 애스펙트(최대 15개) + 패턴 + 원소/양식 분포
 */

import type { WesternChart, WesternPlanet, WesternAspect } from '../types.js'

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
  Chiron: '카이론(Chiron)',
  Ascendant: '상승점(ASC)',
}

/** 교점 한국어 이름 */
const NODE_NAME_KO: Record<string, string> = {
  'North Node': '북교점(☊)',
  'South Node': '남교점(☋)',
}

/** 애스펙트 최대 개수 */
const MAX_ASPECTS = 15

function formatPlanet(planet: WesternPlanet): string {
  const ko = PLANET_NAME_KO[planet.name] || planet.name
  const retro = planet.isRetrograde ? ' ℞' : ''
  const dignity = planet.dignity.state !== 'neutral' ? ` — ${planet.dignity.state}` : ''
  return `- ${ko}: ${planet.sign} ${planet.degree}°${planet.minute}'${retro} (${planet.house}하우스${dignity})`
}

function formatAspect(aspect: WesternAspect): string {
  const b1 = PLANET_NAME_KO[aspect.body1] || NODE_NAME_KO[aspect.body1] || aspect.body1
  const b2 = PLANET_NAME_KO[aspect.body2] || NODE_NAME_KO[aspect.body2] || aspect.body2
  const applying = aspect.isApplying ? '접근중' : '분리중'
  return `- ${b1} ${aspect.symbol} ${b2}: ${aspect.type} (orb ${aspect.orb.toFixed(1)}°, ${applying})`
}

export function formatWestern(chart: WesternChart): string {
  const lines: string[] = []

  lines.push('## 서양 점성술 분석')
  lines.push('')

  // 앵글
  const { ascendant, midheaven } = chart.angles
  lines.push('### 앵글')
  lines.push(`ASC: ${ascendant.sign} ${ascendant.degree}°${ascendant.minute}' | MC: ${midheaven.sign} ${midheaven.degree}°${midheaven.minute}'`)

  // Big 3
  lines.push('')
  lines.push('### Big 3')
  lines.push(`태양: ${chart.sunSign} | 달: ${chart.moonSign} | 상승: ${chart.risingSign}`)

  // 전체 행성
  lines.push('')
  lines.push('### 행성 배치')

  for (const planet of chart.planets) {
    lines.push(formatPlanet(planet))
  }

  // 교점
  const nodes = chart.nodes ?? []
  if (nodes.length > 0) {
    lines.push('')
    lines.push('### 교점')
    for (const node of nodes) {
      const ko = NODE_NAME_KO[node.name] || node.name
      lines.push(`- ${ko} [${node.type}]: ${node.sign} ${node.degree}°${node.minute}' (${node.house}하우스)`)
    }
  }

  // 12 하우스 커스프
  if (chart.houses.cusps.length > 0) {
    lines.push('')
    lines.push('### 12 하우스 커스프')
    const cuspParts = chart.houses.cusps.map(
      (c) => `${c.house}H ${c.sign} ${c.degree}°${c.minute}'`,
    )
    // 4개씩 나누어 출력
    for (let i = 0; i < cuspParts.length; i += 4) {
      lines.push(cuspParts.slice(i, i + 4).join(' | '))
    }
  }

  // 주요 애스펙트 (strength 기준 상위, 최대 15개)
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
