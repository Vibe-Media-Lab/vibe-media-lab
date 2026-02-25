import { calculateSaju, solarToLunar } from '@fullstackfamily/manseryeok'
import type { SajuChart, SajuPillar, FiveElementCount, YinYangBalance } from '../types.js'
import type { SajuInput } from '../input/normalize.js'
import { STEMS, BRANCHES } from './saju-constants.js'
import { getSipsin, getMainJanggan, JANGGAN, UNSEONG } from './saju-tables.js'

/**
 * 기둥 한글 문자열 → SajuPillar 파싱
 * "임신" → stem="임", branch="신"
 */
function parsePillar(hangul: string, hanja: string): SajuPillar {
  const stem = hangul[0]!
  const branch = hangul[1]!

  const stemInfo = STEMS[stem]
  const branchInfo = BRANCHES[branch]

  if (!stemInfo) throw new Error(`알 수 없는 천간: ${stem}`)
  if (!branchInfo) throw new Error(`알 수 없는 지지: ${branch}`)

  return {
    hangul,
    hanja,
    stem,
    branch,
    stemElement: stemInfo.element,
    branchElement: branchInfo.element,
    stemYinYang: stemInfo.yinYang,
    branchYinYang: branchInfo.yinYang,
  }
}

/**
 * 기둥들에서 오행 분포 계산
 */
function countFiveElements(pillars: SajuPillar[]): FiveElementCount {
  const count: FiveElementCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of pillars) {
    count[p.stemElement]++
    count[p.branchElement]++
  }
  return count
}

/**
 * 기둥들에서 음양 밸런스 계산
 */
function countYinYang(pillars: SajuPillar[]): YinYangBalance {
  const balance: YinYangBalance = { 양: 0, 음: 0 }
  for (const p of pillars) {
    balance[p.stemYinYang]++
    balance[p.branchYinYang]++
  }
  return balance
}

/**
 * manseryeok 라이브러리로 사주 계산
 */
export function computeSaju(input: SajuInput): SajuChart {
  // manseryeok 호출
  const result = calculateSaju(
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    { longitude: input.longitude },
  )

  // 기둥 파싱
  const yearPillar = parsePillar(result.yearPillar, result.yearPillarHanja)
  const monthPillar = parsePillar(result.monthPillar, result.monthPillarHanja)
  const dayPillar = parsePillar(result.dayPillar, result.dayPillarHanja)

  // 시주 처리 (unknownTime 시 hourPillar 없음)
  let hourPillar: SajuPillar | null = null
  if (result.hourPillar && result.hourPillarHanja) {
    hourPillar = parsePillar(result.hourPillar, result.hourPillarHanja)
  }

  // 활성 기둥 목록
  const activePillars = [yearPillar, monthPillar, dayPillar]
  if (hourPillar) activePillars.push(hourPillar)

  // 십신/운성/장간 enrichment
  const dayStem = dayPillar.stem
  for (const pillar of activePillars) {
    if (pillar === dayPillar) {
      pillar.stemSipsin = '본원'
    } else {
      pillar.stemSipsin = getSipsin(dayStem, pillar.stem)
    }
    pillar.branchSipsin = getSipsin(dayStem, getMainJanggan(pillar.branch))
    pillar.unseong = UNSEONG[dayStem]?.[pillar.branch]
    pillar.janggan = JANGGAN[pillar.branch]
  }

  // 오행/음양 계산
  const fiveElements = countFiveElements(activePillars)
  const yinYangBalance = countYinYang(activePillars)

  // 음력 날짜 조회 — 실패해도 사주 계산 자체는 성공으로 처리
  let lunarDate: SajuChart['lunarDate']
  try {
    const lunarInfo = solarToLunar(input.year, input.month, input.day)
    lunarDate = {
      year: lunarInfo.lunar.year,
      month: lunarInfo.lunar.month,
      day: lunarInfo.lunar.day,
      isLeapMonth: lunarInfo.lunar.isLeapMonth,
    }
  } catch {
    // lunarDate는 optional이므로 undefined 유지
  }

  return {
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    fiveElements,
    yinYangBalance,
    lunarDate,
    correctedTime: result.correctedTime
      ? { hour: result.correctedTime.hour, minute: result.correctedTime.minute }
      : undefined,
  }
}
