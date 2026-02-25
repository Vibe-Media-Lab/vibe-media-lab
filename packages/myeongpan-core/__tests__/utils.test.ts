import { describe, it, expect } from 'vitest'
import { parseLocalDateTime, ianaToUtcOffset, hourToChineseIndex, computeConfigHash } from '../src/utils.js'
import type { BirthProfile } from '../src/types.js'

describe('parseLocalDateTime', () => {
  it('날짜+시간 파싱', () => {
    const result = parseLocalDateTime('1992-10-24T05:30')
    expect(result).toEqual({ year: 1992, month: 10, day: 24, hour: 5, minute: 30 })
  })

  it('날짜만 파싱 (시간 미상)', () => {
    const result = parseLocalDateTime('1985-03-15')
    expect(result).toEqual({ year: 1985, month: 3, day: 15, hour: undefined, minute: undefined })
  })

  it('자정 시간 파싱', () => {
    const result = parseLocalDateTime('1990-01-01T00:00')
    expect(result).toEqual({ year: 1990, month: 1, day: 1, hour: 0, minute: 0 })
  })

  it('23시 파싱', () => {
    const result = parseLocalDateTime('1978-06-22T23:00')
    expect(result).toEqual({ year: 1978, month: 6, day: 22, hour: 23, minute: 0 })
  })

  it('초 포함 시간 파싱', () => {
    const result = parseLocalDateTime('2000-08-16T14:30:00')
    expect(result).toEqual({ year: 2000, month: 8, day: 16, hour: 14, minute: 30 })
  })
})

describe('ianaToUtcOffset', () => {
  it('서울 (UTC+9, DST 없음)', () => {
    const offset = ianaToUtcOffset('Asia/Seoul', new Date(1992, 9, 24, 5, 30))
    expect(offset).toBe(9)
  })

  it('뉴욕 여름 (EDT, UTC-4)', () => {
    const offset = ianaToUtcOffset('America/New_York', new Date(2000, 7, 16, 14, 0))
    expect(offset).toBe(-4)
  })

  it('뉴욕 겨울 (EST, UTC-5)', () => {
    const offset = ianaToUtcOffset('America/New_York', new Date(2000, 0, 15, 12, 0))
    expect(offset).toBe(-5)
  })

  it('런던 겨울 (GMT, UTC+0)', () => {
    const offset = ianaToUtcOffset('Europe/London', new Date(1990, 0, 1, 0, 0))
    expect(offset).toBe(0)
  })

  it('런던 여름 (BST, UTC+1)', () => {
    const offset = ianaToUtcOffset('Europe/London', new Date(2000, 6, 15, 12, 0))
    expect(offset).toBe(1)
  })

  it('인도 (UTC+5:30)', () => {
    const offset = ianaToUtcOffset('Asia/Kolkata', new Date(2000, 0, 1, 12, 0))
    expect(offset).toBe(5.5)
  })
})

describe('hourToChineseIndex', () => {
  it('자시 — 23시', () => expect(hourToChineseIndex(23)).toBe(0))
  it('자시 — 0시(자정)', () => expect(hourToChineseIndex(0)).toBe(0))
  it('축시 — 1시', () => expect(hourToChineseIndex(1)).toBe(1))
  it('축시 — 2시', () => expect(hourToChineseIndex(2)).toBe(1))
  it('인시 — 3시', () => expect(hourToChineseIndex(3)).toBe(2))
  it('인시 — 4시', () => expect(hourToChineseIndex(4)).toBe(2))
  it('묘시 — 5시', () => expect(hourToChineseIndex(5)).toBe(3))
  it('오시 — 12시', () => expect(hourToChineseIndex(12)).toBe(6))
  it('유시 — 17시', () => expect(hourToChineseIndex(17)).toBe(9))
  it('해시 — 21시', () => expect(hourToChineseIndex(21)).toBe(11))
  it('해시 — 22시', () => expect(hourToChineseIndex(22)).toBe(11))
  it('범위 밖 — -1', () => expect(() => hourToChineseIndex(-1)).toThrow('유효하지 않은 시간'))
  it('범위 밖 — 24', () => expect(() => hourToChineseIndex(24)).toThrow('유효하지 않은 시간'))
})

describe('computeConfigHash', () => {
  const baseProfile: BirthProfile = {
    birthDateTimeLocal: '1992-10-24T05:30',
    timezone: 'Asia/Seoul',
    location: { lat: 37.5665, lon: 126.978 },
    calendarMode: 'solar',
    isLeapMonth: false,
    gender: 'male',
    unknownTime: false,
  }

  it('16자 해시 반환', () => {
    const hash = computeConfigHash(baseProfile)
    expect(hash).toHaveLength(16)
    expect(hash).toMatch(/^[a-f0-9]{16}$/)
  })

  it('동일 입력 → 동일 해시', () => {
    const hash1 = computeConfigHash(baseProfile)
    const hash2 = computeConfigHash({ ...baseProfile })
    expect(hash1).toBe(hash2)
  })

  it('다른 입력 → 다른 해시', () => {
    const hash1 = computeConfigHash(baseProfile)
    const hash2 = computeConfigHash({ ...baseProfile, gender: 'female' })
    expect(hash1).not.toBe(hash2)
  })
})
