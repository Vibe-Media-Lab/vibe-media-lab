import { lunarToSolar } from '@fullstackfamily/manseryeok'
import type { BirthProfile } from '../types.js'
import { parseLocalDateTime, ianaToUtcOffset, hourToChineseIndex } from '../utils.js'

/** manseryeok 엔진 입력 */
export interface SajuInput {
  year: number
  month: number
  day: number
  hour: number | undefined
  minute: number | undefined
  longitude: number
  useLongitudeCorrection: boolean
}

/** iztro 엔진 입력 */
export interface ZiweiInput {
  dateStr: string // 'YYYY-M-D'
  timeIndex: number // 0-12
  gender: '남' | '여'
  fixLeap: boolean
}

/** celestine 엔진 입력 */
export interface WesternInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  timezone: number // UTC 오프셋 (시간 단위)
  latitude: number
  longitude: number
  houseSystem: string
}

export interface NormalizedInputs {
  saju: SajuInput
  ziwei: ZiweiInput | null
  western: WesternInput | null
  /** 양력 변환된 날짜 (음력 입력 시) */
  solarDate: { year: number; month: number; day: number }
}

/**
 * BirthProfile → 각 엔진별 입력 형식으로 정규화
 *
 * calendarMode='lunar' → manseryeok.lunarToSolar()로 양력 변환 후 엔진에 전달
 * unknownTime → ziwei/western 입력은 null
 */
export function normalizeBirthProfile(profile: BirthProfile): NormalizedInputs {
  const parsed = parseLocalDateTime(profile.birthDateTimeLocal)

  // 음력 → 양력 변환
  let solarYear = parsed.year
  let solarMonth = parsed.month
  let solarDay = parsed.day

  if (profile.calendarMode === 'lunar') {
    const converted = lunarToSolar(
      parsed.year,
      parsed.month,
      parsed.day,
      profile.isLeapMonth,
    )
    solarYear = converted.solar.year
    solarMonth = converted.solar.month
    solarDay = converted.solar.day
  }

  // 시간 처리
  const hasTime = !profile.unknownTime && parsed.hour !== undefined
  const hour = hasTime ? parsed.hour : undefined
  const minute = hasTime ? (parsed.minute ?? 0) : undefined

  // manseryeok 입력
  const saju: SajuInput = {
    year: solarYear,
    month: solarMonth,
    day: solarDay,
    hour,
    minute,
    longitude: profile.location.lon,
    useLongitudeCorrection: profile.config?.saju?.useLongitudeCorrection ?? true,
  }

  // iztro 입력 (unknownTime 시 null)
  let ziwei: ZiweiInput | null = null
  if (hasTime && hour !== undefined) {
    ziwei = {
      dateStr: `${solarYear}-${solarMonth}-${solarDay}`,
      timeIndex: hourToChineseIndex(hour),
      gender: profile.gender === 'male' ? '남' : '여',
      fixLeap: profile.config?.ziwei?.fixLeap ?? true,
    }
  }

  // celestine 입력 (unknownTime 시 null)
  let western: WesternInput | null = null
  if (hasTime && hour !== undefined) {
    // 양력 날짜 기준 UTC 오프셋 계산
    // UTC 기준으로 생성하여 서버 로컬 시간대 개입 방지
    const dateForOffset = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay, hour, minute ?? 0))
    const utcOffset = ianaToUtcOffset(profile.timezone, dateForOffset)

    western = {
      year: solarYear,
      month: solarMonth,
      day: solarDay,
      hour,
      minute: minute ?? 0,
      timezone: utcOffset,
      latitude: profile.location.lat,
      longitude: profile.location.lon,
      houseSystem: profile.config?.western?.houseSystem ?? 'placidus',
    }
  }

  return {
    saju,
    ziwei,
    western,
    solarDate: { year: solarYear, month: solarMonth, day: solarDay },
  }
}
