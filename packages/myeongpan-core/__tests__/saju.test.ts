import { describe, it, expect } from 'vitest'
import { computeSaju } from '../src/engines/saju.js'
import type { SajuInput } from '../src/input/normalize.js'

describe('computeSaju', () => {
  describe('기본 계산', () => {
    const input: SajuInput = {
      year: 1992, month: 10, day: 24,
      hour: 5, minute: 30,
      longitude: 126.978,
      useLongitudeCorrection: true,
    }

    it('4주 모두 계산됨', () => {
      const result = computeSaju(input)
      expect(result.pillars.year).toBeDefined()
      expect(result.pillars.month).toBeDefined()
      expect(result.pillars.day).toBeDefined()
      expect(result.pillars.hour).toBeDefined()
    })

    it('연주가 임신(壬申)', () => {
      const result = computeSaju(input)
      expect(result.pillars.year.hangul).toBe('임신')
      expect(result.pillars.year.hanja).toBe('壬申')
    })

    it('월주가 경술(庚戌)', () => {
      const result = computeSaju(input)
      expect(result.pillars.month.hangul).toBe('경술')
      expect(result.pillars.month.hanja).toBe('庚戌')
    })

    it('일주가 계유(癸酉)', () => {
      const result = computeSaju(input)
      expect(result.pillars.day.hangul).toBe('계유')
      expect(result.pillars.day.hanja).toBe('癸酉')
    })

    it('시주가 갑인(甲寅)', () => {
      const result = computeSaju(input)
      expect(result.pillars.hour!.hangul).toBe('갑인')
      expect(result.pillars.hour!.hanja).toBe('甲寅')
    })

    it('천간 오행/음양 매핑 정확', () => {
      const result = computeSaju(input)
      // 임 = 수/양
      expect(result.pillars.year.stemElement).toBe('수')
      expect(result.pillars.year.stemYinYang).toBe('양')
      // 경 = 금/양
      expect(result.pillars.month.stemElement).toBe('금')
      expect(result.pillars.month.stemYinYang).toBe('양')
      // 계 = 수/음
      expect(result.pillars.day.stemElement).toBe('수')
      expect(result.pillars.day.stemYinYang).toBe('음')
    })

    it('지지 오행/음양 매핑 정확', () => {
      const result = computeSaju(input)
      // 신 = 금/양
      expect(result.pillars.year.branchElement).toBe('금')
      expect(result.pillars.year.branchYinYang).toBe('양')
      // 술 = 토/양
      expect(result.pillars.month.branchElement).toBe('토')
      expect(result.pillars.month.branchYinYang).toBe('양')
    })

    it('오행 분포 합계 = (활성 기둥 수) * 2', () => {
      const result = computeSaju(input)
      const total = Object.values(result.fiveElements).reduce((a, b) => a + b, 0)
      expect(total).toBe(8) // 4주 * 2 (천간+지지)
    })

    it('음양 밸런스 합계 = (활성 기둥 수) * 2', () => {
      const result = computeSaju(input)
      const total = result.yinYangBalance.양 + result.yinYangBalance.음
      expect(total).toBe(8)
    })

    it('음력 날짜 반환', () => {
      const result = computeSaju(input)
      expect(result.lunarDate).toBeDefined()
      expect(result.lunarDate!.year).toBe(1992)
      expect(result.lunarDate!.month).toBe(9)
      expect(result.lunarDate!.day).toBe(29)
    })

    it('경도 보정된 시간 반환', () => {
      const result = computeSaju(input)
      expect(result.correctedTime).toBeDefined()
    })
  })

  describe('시간 미상 (hour=undefined)', () => {
    const input: SajuInput = {
      year: 1985, month: 3, day: 15,
      hour: undefined, minute: undefined,
      longitude: 129.0756,
      useLongitudeCorrection: true,
    }

    it('시주가 null', () => {
      const result = computeSaju(input)
      expect(result.pillars.hour).toBeNull()
    })

    it('오행 분포 합계 = 6 (3주)', () => {
      const result = computeSaju(input)
      const total = Object.values(result.fiveElements).reduce((a, b) => a + b, 0)
      expect(total).toBe(6)
    })

    it('음양 밸런스 합계 = 6 (3주)', () => {
      const result = computeSaju(input)
      const total = result.yinYangBalance.양 + result.yinYangBalance.음
      expect(total).toBe(6)
    })
  })

  describe('경계 케이스', () => {
    it('자정 (00:00) 계산', () => {
      const input: SajuInput = {
        year: 1990, month: 1, day: 1,
        hour: 0, minute: 0,
        longitude: -0.1278,
        useLongitudeCorrection: true,
      }
      const result = computeSaju(input)
      expect(result.pillars.year).toBeDefined()
      expect(result.pillars.hour).toBeDefined()
    })

    it('23시 (자시 경계) 계산', () => {
      const input: SajuInput = {
        year: 1978, month: 6, day: 22,
        hour: 23, minute: 0,
        longitude: 126.978,
        useLongitudeCorrection: true,
      }
      const result = computeSaju(input)
      expect(result.pillars.hour).toBeDefined()
    })

    it('지원 범위 내 연도 (1900)', () => {
      const input: SajuInput = {
        year: 1900, month: 6, day: 15,
        hour: 12, minute: 0,
        longitude: 126.978,
        useLongitudeCorrection: true,
      }
      const result = computeSaju(input)
      expect(result.pillars.year).toBeDefined()
    })

    it('지원 범위 내 연도 (2050)', () => {
      const input: SajuInput = {
        year: 2050, month: 6, day: 15,
        hour: 12, minute: 0,
        longitude: 126.978,
        useLongitudeCorrection: true,
      }
      const result = computeSaju(input)
      expect(result.pillars.year).toBeDefined()
    })
  })
})
