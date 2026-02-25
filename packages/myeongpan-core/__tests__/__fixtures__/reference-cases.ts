import type { BirthProfile } from '../../src/types.js'

/**
 * 레퍼런스 테스트 케이스 5개
 * - 라이브러리 버전 고정 (exact pin) + 스냅샷으로 회귀 감지
 */

/** 케이스 1: 기본 케이스 — 1992-10-24 05:30 서울 남성 (양력) */
export const CASE_1_BASIC: BirthProfile = {
  birthDateTimeLocal: '1992-10-24T05:30',
  timezone: 'Asia/Seoul',
  location: { lat: 37.5665, lon: 126.978, placeName: '서울' },
  calendarMode: 'solar',
  isLeapMonth: false,
  gender: 'male',
  unknownTime: false,
}

/** 케이스 2: 시간 미상 — 1985-03-15 부산 여성 (양력) */
export const CASE_2_UNKNOWN_TIME: BirthProfile = {
  birthDateTimeLocal: '1985-03-15',
  timezone: 'Asia/Seoul',
  location: { lat: 35.1796, lon: 129.0756, placeName: '부산' },
  calendarMode: 'solar',
  isLeapMonth: false,
  gender: 'female',
  unknownTime: true,
}

/** 케이스 3: DST 시간대 — 2000-08-16 14:00 뉴욕 여성 (양력) */
export const CASE_3_DST: BirthProfile = {
  birthDateTimeLocal: '2000-08-16T14:00',
  timezone: 'America/New_York',
  location: { lat: 40.7128, lon: -74.006, placeName: '뉴욕' },
  calendarMode: 'solar',
  isLeapMonth: false,
  gender: 'female',
  unknownTime: false,
}

/** 케이스 4: 자정 경계 — 1990-01-01 00:00 런던 남성 (양력) */
export const CASE_4_MIDNIGHT: BirthProfile = {
  birthDateTimeLocal: '1990-01-01T00:00',
  timezone: 'Europe/London',
  location: { lat: 51.5074, lon: -0.1278, placeName: '런던' },
  calendarMode: 'solar',
  isLeapMonth: false,
  gender: 'male',
  unknownTime: false,
}

/** 케이스 5: 자시(子時) 경계 — 1978-06-22 23:00 서울 남성 (양력) */
export const CASE_5_ZI_HOUR: BirthProfile = {
  birthDateTimeLocal: '1978-06-22T23:00',
  timezone: 'Asia/Seoul',
  location: { lat: 37.5665, lon: 126.978, placeName: '서울' },
  calendarMode: 'solar',
  isLeapMonth: false,
  gender: 'male',
  unknownTime: false,
}

/** 모든 레퍼런스 케이스 */
export const ALL_REFERENCE_CASES = [
  { name: '기본 (서울 남성)', profile: CASE_1_BASIC },
  { name: '시간미상 (부산 여성)', profile: CASE_2_UNKNOWN_TIME },
  { name: 'DST (뉴욕 여성)', profile: CASE_3_DST },
  { name: '자정 경계 (런던 남성)', profile: CASE_4_MIDNIGHT },
  { name: '자시 경계 (서울 남성)', profile: CASE_5_ZI_HOUR },
] as const
