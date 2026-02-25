/**
 * 자미두수(紫微斗數) 포매터
 *
 * ZiweiChart → LLM 입력 텍스트 (~400 토큰)
 * 핵심 7궁 선별 (명궁, 재백궁, 관록궁, 부처궁, 질액궁, 천이궁 + 신궁)
 * 주성 + brightness/mutagen만 출력, 잡성 생략
 */

import type { ZiweiChart, ZiweiPalace, ZiweiStar } from '../types.js'

/** 핵심 궁위 이름 (name 매칭) */
const KEY_PALACE_NAMES = [
  '命宫', '财帛', '官禄', '夫妻', '疾厄', '迁移',
] as const

/** 궁위 이름 한국어 매핑 */
const PALACE_NAME_KO: Record<string, string> = {
  '命宫': '명궁(命宮)',
  '财帛': '재백궁(財帛宮)',
  '官禄': '관록궁(官祿宮)',
  '夫妻': '부처궁(夫妻宮)',
  '疾厄': '질액궁(疾厄宮)',
  '迁移': '천이궁(遷移宮)',
  '兄弟': '형제궁(兄弟宮)',
  '子女': '자녀궁(子女宮)',
  '仆役': '노복궁(奴僕宮)',
  '田宅': '전택궁(田宅宮)',
  '福德': '복덕궁(福德宮)',
  '父母': '부모궁(父母宮)',
}

function findPalaceByName(palaces: ZiweiPalace[], name: string): ZiweiPalace | undefined {
  return palaces.find((p) => p.name === name)
}

function findBodyPalace(palaces: ZiweiPalace[]): ZiweiPalace | undefined {
  return palaces.find((p) => p.isBodyPalace)
}

function formatStar(star: ZiweiStar): string {
  const parts = [star.name]
  if (star.brightness) parts.push(`(${star.brightness})`)
  if (star.mutagen) parts.push(`[${star.mutagen}]`)
  return parts.join('')
}

function formatPalace(palace: ZiweiPalace): string {
  const name = PALACE_NAME_KO[palace.name] || palace.name
  const lines: string[] = []

  const header = palace.isBodyPalace ? `${name} ★신궁` : name
  lines.push(`- **${header}** [${palace.heavenlyStem}${palace.earthlyBranch}]`)

  // 주성만 출력
  const majorStarStr = palace.majorStars.map(formatStar).join(', ')
  if (majorStarStr) {
    lines.push(`  주성: ${majorStarStr}`)
  }

  // 부성 중 주요한 것만 (첫 3개)
  const keyMinors = palace.minorStars.slice(0, 3).map(formatStar).join(', ')
  if (keyMinors) {
    lines.push(`  부성: ${keyMinors}`)
  }

  // 장생12신
  if (palace.changsheng12) {
    lines.push(`  장생12신: ${palace.changsheng12}`)
  }

  return lines.join('\n')
}

export function formatZiwei(chart: ZiweiChart): string {
  const lines: string[] = []

  lines.push('## 자미두수(紫微斗數) 분석')
  lines.push('')

  // 기본 정보
  lines.push('### 기본 정보')
  lines.push(`명주: ${chart.soul} | 신주: ${chart.body}`)
  lines.push(`오행국: ${chart.fiveElementsClass}`)
  lines.push(`띠: ${chart.zodiac} | 궁: ${chart.sign}`)

  // 핵심 궁위 (최대 7개)
  lines.push('')
  lines.push('### 핵심 궁위')

  const selectedPalaces: ZiweiPalace[] = []

  // 1. 핵심 6궁 이름 매칭
  for (const name of KEY_PALACE_NAMES) {
    const palace = findPalaceByName(chart.palaces, name)
    if (palace) selectedPalaces.push(palace)
  }

  // 2. 신궁 추가 (이미 포함되지 않은 경우)
  const bodyPalace = findBodyPalace(chart.palaces)
  if (bodyPalace && !selectedPalaces.includes(bodyPalace)) {
    selectedPalaces.push(bodyPalace)
  }

  for (const palace of selectedPalaces) {
    lines.push(formatPalace(palace))
  }

  return lines.join('\n')
}
