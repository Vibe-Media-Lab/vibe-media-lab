/**
 * 사주(四柱) 포매터
 *
 * SajuChart → LLM 입력 텍스트 (~450 토큰)
 * 4주 테이블 + 십신/12운성/지장간 인라인 + 오행 분포 + 음양 균형 + 일간 분석
 */

import type { SajuChart, SajuPillar } from '../types.js'

function formatPillar(label: string, pillar: SajuPillar | null): string {
  if (!pillar) return `${label}: (미상)`

  let line = `${label}: ${pillar.hangul}(${pillar.hanja}) — 천간 ${pillar.stem}(${pillar.stemElement}/${pillar.stemYinYang})`

  // 천간 십신
  if (pillar.stemSipsin) {
    line += `[${pillar.stemSipsin}]`
  }

  line += ` 지지 ${pillar.branch}(${pillar.branchElement}/${pillar.branchYinYang})`

  // 지지 십신
  if (pillar.branchSipsin) {
    line += `[${pillar.branchSipsin}]`
  }

  // 12운성
  if (pillar.unseong) {
    line += ` 운성:${pillar.unseong}`
  }

  // 지장간
  if (pillar.janggan && pillar.janggan.length > 0) {
    line += ` 장간:${pillar.janggan.join(',')}`
  }

  return line
}

export function formatSaju(chart: SajuChart, unknownTime: boolean): string {
  const lines: string[] = []

  lines.push('## 사주(四柱) 분석')
  lines.push('')

  // 4주 테이블
  lines.push('### 사주 구성')
  lines.push(formatPillar('연주(年柱)', chart.pillars.year))
  lines.push(formatPillar('월주(月柱)', chart.pillars.month))
  lines.push(formatPillar('일주(日柱)', chart.pillars.day))
  lines.push(formatPillar('시주(時柱)', unknownTime ? null : chart.pillars.hour))

  if (unknownTime) {
    lines.push('')
    lines.push('⚠️ 출생시간 미상: 시주 없이 3주 기반 분석. 일간 중심으로 해석.')
  }

  // 일간 분석
  const dayStem = chart.pillars.day
  lines.push('')
  lines.push(`### 일간(日干): ${dayStem.stem}(${dayStem.stemElement}/${dayStem.stemYinYang})`)

  // 오행 분포
  const { fiveElements } = chart
  const total = fiveElements.목 + fiveElements.화 + fiveElements.토 + fiveElements.금 + fiveElements.수
  lines.push('')
  lines.push('### 오행 분포')
  lines.push(`목(木): ${fiveElements.목} | 화(火): ${fiveElements.화} | 토(土): ${fiveElements.토} | 금(金): ${fiveElements.금} | 수(水): ${fiveElements.수} (총 ${total})`)

  // 과다/부족 분석
  const avg = total / 5
  const excess = Object.entries(fiveElements)
    .filter(([, v]) => v > avg * 1.5)
    .map(([k]) => k)
  const deficient = Object.entries(fiveElements)
    .filter(([, v]) => v === 0)
    .map(([k]) => k)

  if (excess.length > 0) lines.push(`과다: ${excess.join(', ')}`)
  if (deficient.length > 0) lines.push(`부족: ${deficient.join(', ')}`)

  // 음양 균형
  const { yinYangBalance } = chart
  lines.push('')
  lines.push('### 음양 균형')
  lines.push(`양(陽): ${yinYangBalance.양} | 음(陰): ${yinYangBalance.음}`)

  // 음력 날짜
  if (chart.lunarDate) {
    const { year, month, day, isLeapMonth } = chart.lunarDate
    lines.push('')
    lines.push(`음력: ${year}년 ${isLeapMonth ? '윤' : ''}${month}월 ${day}일`)
  }

  return lines.join('\n')
}
