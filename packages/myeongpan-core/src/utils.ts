import { createHash } from 'node:crypto'
import type { BirthProfile } from './types.js'

/**
 * ISO 로컬 시간 문자열 → 개별 컴포넌트
 * "1992-10-24T05:30" → { year: 1992, month: 10, day: 24, hour: 5, minute: 30 }
 * "1992-10-24" → { year: 1992, month: 10, day: 24, hour: undefined, minute: undefined }
 */
export function parseLocalDateTime(iso: string): {
  year: number
  month: number
  day: number
  hour: number | undefined
  minute: number | undefined
} {
  const [datePart, timePart] = iso.split('T')
  const [year, month, day] = datePart!.split('-').map(Number)

  if (timePart) {
    const [hour, minute] = timePart.split(':').map(Number)
    return { year: year!, month: month!, day: day!, hour, minute }
  }

  return { year: year!, month: month!, day: day!, hour: undefined, minute: undefined }
}

/**
 * IANA 시간대 → UTC 오프셋 (시간 단위)
 * DST 자동 처리: 해당 날짜/시간 기준 실제 오프셋 계산
 *
 * @example ianaToUtcOffset('Asia/Seoul', new Date('1992-10-24T05:30')) → 9
 * @example ianaToUtcOffset('America/New_York', new Date('2000-08-16T14:00')) → -4 (EDT)
 */
export function ianaToUtcOffset(timezone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  })

  const parts = formatter.formatToParts(date)
  const tzPart = parts.find((p) => p.type === 'timeZoneName')
  if (!tzPart) {
    throw new Error(`시간대 오프셋을 가져올 수 없습니다: ${timezone}`)
  }

  // "GMT+9", "GMT-4", "GMT+5:30", "GMT" 형식 파싱
  const match = tzPart.value.match(/^GMT([+-]?)(\d{1,2})(?::(\d{2}))?$/)
  if (!match) {
    // "GMT" (= UTC+0)
    if (tzPart.value === 'GMT') return 0
    throw new Error(`시간대 오프셋 파싱 실패: ${tzPart.value}`)
  }

  const sign = match[1] === '-' ? -1 : 1
  const hours = parseInt(match[2]!, 10)
  const minutes = parseInt(match[3] || '0', 10)

  return sign * (hours + minutes / 60)
}

/**
 * 24시간 → 시진(時辰) 인덱스 (0-12)
 * iztro 입력에 사용. 23시부터 자시(0) 시작.
 *
 * 0=자시(23-01), 1=축시(01-03), 2=인시(03-05), ..., 11=해시(21-23)
 * 12=정확한 자정(조기자시) — iztro에서 특별 처리
 */
export function hourToChineseIndex(hour: number): number {
  if (hour < 0 || hour > 23) throw new Error(`유효하지 않은 시간: ${hour}`)
  if (hour === 0 || hour === 23) return 0 // 자시(子時)
  return Math.floor((hour + 1) / 2)
}

/**
 * 입력 프로필 해시 (결과 재현 확인용)
 * SHA-256의 앞 16자
 */
export function computeConfigHash(profile: BirthProfile): string {
  const input = JSON.stringify({
    b: profile.birthDateTimeLocal,
    t: profile.timezone,
    l: profile.location,
    c: profile.calendarMode,
    lm: profile.isLeapMonth,
    g: profile.gender,
    u: profile.unknownTime,
    cfg: profile.config,
  })
  return createHash('sha256').update(input).digest('hex').substring(0, 16)
}
