/**
 * 자미두수(紫微斗數) 포매터
 *
 * ZiweiChart → LLM 입력 텍스트 (~800 토큰)
 * 12궁 전체 + 길/살성 분류 + 사화 요약 + 대한 일람
 */

import type { ZiweiChart, ZiweiPalace, ZiweiStar } from '../types.js'

/** 궁위 이름 한국어 매핑 (iztro ko locale은 영어 키 반환) */
const PALACE_NAME_KO: Record<string, string> = {
  // iztro 영어 키
  'soulPalace': '명궁(命宮)',
  'wealthPalace': '재백궁(財帛宮)',
  'careerPalace': '관록궁(官祿宮)',
  'spousePalace': '부처궁(夫妻宮)',
  'healthPalace': '질액궁(疾厄宮)',
  'surfacePalace': '천이궁(遷移宮)',
  'siblingsPalace': '형제궁(兄弟宮)',
  'childrenPalace': '자녀궁(子女宮)',
  'friendsPalace': '교우궁(交友宮)',
  'propertyPalace': '전택궁(田宅宮)',
  'spiritPalace': '복덕궁(福德宮)',
  'parentsPalace': '부모궁(父母宮)',
  // 중문 키 (fallback)
  '命宫': '명궁(命宮)',
  '财帛': '재백궁(財帛宮)',
  '官禄': '관록궁(官祿宮)',
  '夫妻': '부처궁(夫妻宮)',
  '疾厄': '질액궁(疾厄宮)',
  '迁移': '천이궁(遷移宮)',
  '兄弟': '형제궁(兄弟宮)',
  '子女': '자녀궁(子女宮)',
  '仆役': '교우궁(交友宮)',
  '田宅': '전택궁(田宅宮)',
  '福德': '복덕궁(福德宮)',
  '父母': '부모궁(父母宮)',
}

/** 핵심 궁위 (★ 표시) */
const CORE_PALACE_NAMES = new Set([
  'soulPalace', 'wealthPalace', 'careerPalace', 'spousePalace', 'healthPalace', 'surfacePalace', 'spiritPalace',
  '命宫', '财帛', '官禄', '夫妻', '疾厄', '迁移', '福德',
])

/** 길성 starType 분류 */
const AUSPICIOUS_TYPES = new Set(['soft', 'helper', 'lucun', 'tianma'])

/** 궁당 부성 최대 수 */
const MAX_AUSPICIOUS = 3
const MAX_MALEFIC = 2

function formatStar(star: ZiweiStar): string {
  const parts = [star.name]
  if (star.brightness) parts.push(`(${star.brightness})`)
  if (star.mutagen) parts.push(`[${star.mutagen}]`)
  return parts.join('')
}

function formatMinorStars(minorStars: ZiweiStar[]): { auspicious: string; malefic: string } {
  const auspiciousStars = minorStars.filter((s) => AUSPICIOUS_TYPES.has(s.starType ?? ''))
  const maleficStars = minorStars.filter((s) => s.starType === 'tough')

  const auspiciousDisplay = auspiciousStars.slice(0, MAX_AUSPICIOUS).map(formatStar)
  const maleficDisplay = maleficStars.slice(0, MAX_MALEFIC).map(formatStar)

  const auspiciousExtra = auspiciousStars.length - MAX_AUSPICIOUS
  const maleficExtra = maleficStars.length - MAX_MALEFIC

  if (auspiciousExtra > 0) auspiciousDisplay.push(`외 ${auspiciousExtra}개`)
  if (maleficExtra > 0) maleficDisplay.push(`외 ${maleficExtra}개`)

  return {
    auspicious: auspiciousDisplay.length > 0 ? auspiciousDisplay.join(', ') : '-',
    malefic: maleficDisplay.length > 0 ? maleficDisplay.join(', ') : '-',
  }
}

function formatPalace(palace: ZiweiPalace): string {
  const rawName = PALACE_NAME_KO[palace.name] || palace.name
  const isCore = CORE_PALACE_NAMES.has(palace.name)
  const isBody = palace.isBodyPalace
  const lines: string[] = []

  // 헤더
  let header = rawName
  if (isCore || isBody) {
    const markers: string[] = []
    if (isCore) markers.push('★')
    if (isBody) markers.push('신궁')
    header = `${markers.join(' ')} ${rawName}`
  }
  lines.push(`- **${header}** [${palace.heavenlyStem}${palace.earthlyBranch}]`)

  // 주성
  const majorStarStr = palace.majorStars.map(formatStar).join(', ')
  lines.push(`  주성: ${majorStarStr || '-'}`)

  // 부성 (길/살 분류)
  const { auspicious, malefic } = formatMinorStars(palace.minorStars)
  lines.push(`  길성: ${auspicious} | 살성: ${malefic}`)

  // 장생12신
  if (palace.changsheng12) {
    lines.push(`  장생12신: ${palace.changsheng12}`)
  }

  return lines.join('\n')
}

/** 사화 수집 — 화록/화권/화과/화기 순서 */
function formatSihuaSummary(palaces: ZiweiPalace[]): string {
  const sihua: Record<string, { star: string; palace: string }[]> = {}

  for (const palace of palaces) {
    const allStars = [...palace.majorStars, ...palace.minorStars]
    for (const star of allStars) {
      if (star.mutagen) {
        if (!sihua[star.mutagen]) sihua[star.mutagen] = []
        sihua[star.mutagen]!.push({
          star: star.name,
          palace: PALACE_NAME_KO[palace.name] || palace.name,
        })
      }
    }
  }

  // iztro는 영어(sihuaLu 등) 또는 중문(禄 등) mutagen 키 사용
  // 화록/화권/화과/화기 순서로 출력 (영어+중문 키 모두 매핑)
  const groupOrder: [string, string[]][] = [
    ['화록', ['sihuaLu', '禄']],
    ['화권', ['sihuaQuan', '权']],
    ['화과', ['sihuaKe', '科']],
    ['화기', ['sihuaJi', '忌']],
  ]
  const parts: string[] = []

  for (const [label, keys] of groupOrder) {
    const entries: { star: string; palace: string }[] = []
    for (const key of keys) {
      if (sihua[key]) entries.push(...sihua[key]!)
    }
    if (entries.length > 0) {
      const details = entries.map((e) => `${e.star} → ${e.palace}`).join(', ')
      parts.push(`${label}: ${details}`)
    }
  }

  return parts.length > 0 ? parts.join(' | ') : ''
}

/** 대한 콤팩트 포맷 */
function formatDecadals(palaces: ZiweiPalace[]): string {
  const decadals: { range: [number, number]; palace: string; majorStars: string }[] = []

  for (const palace of palaces) {
    if (palace.decadal) {
      const palaceName = PALACE_NAME_KO[palace.name] || palace.name
      // 궁 이름에서 괄호 부분 제거 (콤팩트화)
      const shortName = palaceName.replace(/\(.*?\)/, '').trim()
      const majorStars = palace.majorStars.map((s) => s.name).join(',')
      decadals.push({
        range: palace.decadal.range,
        palace: shortName,
        majorStars,
      })
    }
  }

  // 시작 나이 기준 정렬
  decadals.sort((a, b) => a.range[0] - b.range[0])

  return decadals
    .map((d) => {
      const stars = d.majorStars ? ` ${d.majorStars}` : ''
      return `${d.range[0]}-${d.range[1]}세 ${d.palace}${stars}`
    })
    .join(' | ')
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

  // 사화 요약
  const sihua = formatSihuaSummary(chart.palaces)
  if (sihua) {
    lines.push('')
    lines.push('### 사화(四化)')
    lines.push(sihua)
  }

  // 12궁 전체
  lines.push('')
  lines.push('### 12궁 배치')

  for (const palace of chart.palaces) {
    lines.push(formatPalace(palace))
  }

  // 대한 일람
  const decadals = formatDecadals(chart.palaces)
  if (decadals) {
    lines.push('')
    lines.push('### 대한(大限)')
    lines.push(decadals)
  }

  return lines.join('\n')
}
