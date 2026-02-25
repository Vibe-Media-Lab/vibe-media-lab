/**
 * 사주 룩업 테이블 유닛 테스트
 *
 * 십신, 지장간, 12운성 검증
 */

import { describe, it, expect } from 'vitest'
import { getSipsin, JANGGAN, UNSEONG, getMainJanggan } from '../src/engines/saju-tables.js'

// ============================================================
// 십신
// ============================================================

describe('getSipsin', () => {
  // 갑(목/양) 기준 표준 레퍼런스
  it('갑 vs 갑 = 비견', () => expect(getSipsin('갑', '갑')).toBe('비견'))
  it('갑 vs 을 = 겁재', () => expect(getSipsin('갑', '을')).toBe('겁재'))
  it('갑 vs 병 = 식신', () => expect(getSipsin('갑', '병')).toBe('식신'))
  it('갑 vs 정 = 상관', () => expect(getSipsin('갑', '정')).toBe('상관'))
  it('갑 vs 무 = 편재', () => expect(getSipsin('갑', '무')).toBe('편재'))
  it('갑 vs 기 = 정재', () => expect(getSipsin('갑', '기')).toBe('정재'))
  it('갑 vs 경 = 편관', () => expect(getSipsin('갑', '경')).toBe('편관'))
  it('갑 vs 신 = 정관', () => expect(getSipsin('갑', '신')).toBe('정관'))
  it('갑 vs 임 = 편인', () => expect(getSipsin('갑', '임')).toBe('편인'))
  it('갑 vs 계 = 정인', () => expect(getSipsin('갑', '계')).toBe('정인'))

  // 을(목/음) 기준 확인 (음양 반전)
  it('을 vs 갑 = 겁재', () => expect(getSipsin('을', '갑')).toBe('겁재'))
  it('을 vs 을 = 비견', () => expect(getSipsin('을', '을')).toBe('비견'))
  it('을 vs 병 = 상관', () => expect(getSipsin('을', '병')).toBe('상관'))
  it('을 vs 정 = 식신', () => expect(getSipsin('을', '정')).toBe('식신'))

  // 무효 입력
  it('무효 천간 → 빈 문자열', () => expect(getSipsin('갑', 'X')).toBe(''))
  it('빈 문자열 → 빈 문자열', () => expect(getSipsin('', '')).toBe(''))
})

// ============================================================
// 지장간
// ============================================================

describe('JANGGAN', () => {
  it('자 = [임, 계]', () => expect(JANGGAN['자']).toEqual(['임', '계']))
  it('인 = [갑, 병, 무]', () => expect(JANGGAN['인']).toEqual(['갑', '병', '무']))
  it('묘 = [을]', () => expect(JANGGAN['묘']).toEqual(['을']))
  it('축 = [기, 계, 신]', () => expect(JANGGAN['축']).toEqual(['기', '계', '신']))
  it('사 = [병, 경, 무]', () => expect(JANGGAN['사']).toEqual(['병', '경', '무']))
  it('12지지 모두 존재', () => {
    const branches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
    for (const b of branches) {
      expect(JANGGAN[b]).toBeDefined()
      expect(JANGGAN[b]!.length).toBeGreaterThan(0)
    }
  })
})

describe('getMainJanggan', () => {
  it('자 → 임 (본기)', () => expect(getMainJanggan('자')).toBe('임'))
  it('인 → 갑 (본기)', () => expect(getMainJanggan('인')).toBe('갑'))
  it('묘 → 을 (본기)', () => expect(getMainJanggan('묘')).toBe('을'))
  it('무효 지지 → 빈 문자열', () => expect(getMainJanggan('X')).toBe(''))
})

// ============================================================
// 12운성
// ============================================================

describe('UNSEONG', () => {
  it('갑+인 = 건록', () => expect(UNSEONG['갑']?.['인']).toBe('건록'))
  it('갑+해 = 장생', () => expect(UNSEONG['갑']?.['해']).toBe('장생'))
  it('갑+오 = 사', () => expect(UNSEONG['갑']?.['오']).toBe('사'))
  it('갑+묘 = 제왕', () => expect(UNSEONG['갑']?.['묘']).toBe('제왕'))
  it('을+묘 = 건록', () => expect(UNSEONG['을']?.['묘']).toBe('건록'))
  it('을+오 = 장생', () => expect(UNSEONG['을']?.['오']).toBe('장생'))
  it('병+사 = 건록', () => expect(UNSEONG['병']?.['사']).toBe('건록'))
  it('10 천간 모두 존재', () => {
    const stems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
    for (const s of stems) {
      expect(UNSEONG[s]).toBeDefined()
      expect(Object.keys(UNSEONG[s]!).length).toBe(12)
    }
  })
})
