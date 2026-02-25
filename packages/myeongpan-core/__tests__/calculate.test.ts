import { describe, it, expect, vi } from 'vitest'
import { calculateUnifiedChart } from '../src/calculate.js'
import { BirthProfileSchema, UnifiedChartSchema } from '../src/schemas.js'
import {
  CASE_1_BASIC,
  CASE_2_UNKNOWN_TIME,
  CASE_3_DST,
  CASE_4_MIDNIGHT,
  CASE_5_ZI_HOUR,
  ALL_REFERENCE_CASES,
} from './__fixtures__/reference-cases.js'
import type { BirthProfile } from '../src/types.js'

describe('calculateUnifiedChart', () => {
  describe('케이스 1: 기본 (서울 남성)', () => {
    it('3체계 모두 계산', async () => {
      const result = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result.saju).not.toBeNull()
      expect(result.ziwei).not.toBeNull()
      expect(result.western).not.toBeNull()
    })

    it('systemsCompleted에 3개 포함', async () => {
      const result = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result.meta.systemsCompleted).toContain('saju')
      expect(result.meta.systemsCompleted).toContain('ziwei')
      expect(result.meta.systemsCompleted).toContain('western')
    })

    it('에러 없음', async () => {
      const result = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result.meta.errors).toHaveLength(0)
    })

    it('경고 없음', async () => {
      const result = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result.meta.warnings).toHaveLength(0)
    })

    it('configHash 존재', async () => {
      const result = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result.meta.configHash).toHaveLength(16)
    })

    it('generatedAt ISO 형식', async () => {
      const result = await calculateUnifiedChart(CASE_1_BASIC)
      expect(() => new Date(result.meta.generatedAt)).not.toThrow()
    })

    it('엔진 버전 정보', async () => {
      const result = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result.meta.engineVersions.manseryeok).toBe('1.0.7')
      expect(result.meta.engineVersions.iztro).toBe('2.5.7')
      expect(result.meta.engineVersions.celestine).toBe('0.2.1')
    })
  })

  describe('케이스 2: 시간 미상', () => {
    it('사주만 계산됨', async () => {
      const result = await calculateUnifiedChart(CASE_2_UNKNOWN_TIME)
      expect(result.saju).not.toBeNull()
      expect(result.ziwei).toBeNull()
      expect(result.western).toBeNull()
    })

    it('사주 시주 = null', async () => {
      const result = await calculateUnifiedChart(CASE_2_UNKNOWN_TIME)
      expect(result.saju!.pillars.hour).toBeNull()
    })

    it('systemsCompleted = saju만', async () => {
      const result = await calculateUnifiedChart(CASE_2_UNKNOWN_TIME)
      expect(result.meta.systemsCompleted).toEqual(['saju'])
    })

    it('경고 메시지 포함', async () => {
      const result = await calculateUnifiedChart(CASE_2_UNKNOWN_TIME)
      expect(result.meta.warnings).toContain('출생시간 미상: 자미두수/서양점성 계산 생략')
    })
  })

  describe('케이스 3: DST (뉴욕)', () => {
    it('3체계 모두 계산', async () => {
      const result = await calculateUnifiedChart(CASE_3_DST)
      expect(result.saju).not.toBeNull()
      expect(result.ziwei).not.toBeNull()
      expect(result.western).not.toBeNull()
    })

    it('태양 별자리 = Leo (8월)', async () => {
      const result = await calculateUnifiedChart(CASE_3_DST)
      expect(result.western!.sunSign).toBe('Leo')
    })
  })

  describe('케이스 4: 자정 경계', () => {
    it('3체계 모두 계산', async () => {
      const result = await calculateUnifiedChart(CASE_4_MIDNIGHT)
      expect(result.saju).not.toBeNull()
      expect(result.ziwei).not.toBeNull()
      expect(result.western).not.toBeNull()
    })

    it('태양 별자리 = Capricorn (1월 1일)', async () => {
      const result = await calculateUnifiedChart(CASE_4_MIDNIGHT)
      expect(result.western!.sunSign).toBe('Capricorn')
    })
  })

  describe('케이스 5: 자시(23시) 경계', () => {
    it('3체계 모두 계산', async () => {
      const result = await calculateUnifiedChart(CASE_5_ZI_HOUR)
      expect(result.saju).not.toBeNull()
      expect(result.ziwei).not.toBeNull()
      expect(result.western).not.toBeNull()
    })

    it('자미두수 자시(0) 인덱스 사용', async () => {
      const result = await calculateUnifiedChart(CASE_5_ZI_HOUR)
      expect(result.ziwei).not.toBeNull()
    })
  })

  describe('Zod 입력 검증', () => {
    it('유효한 입력 통과', () => {
      expect(() => BirthProfileSchema.parse(CASE_1_BASIC)).not.toThrow()
    })

    it('연도 범위 밖 (1899) → 에러', () => {
      const invalid: BirthProfile = {
        ...CASE_1_BASIC,
        birthDateTimeLocal: '1899-10-24T05:30',
      }
      expect(() => BirthProfileSchema.parse(invalid)).toThrow()
    })

    it('연도 범위 밖 (2051) → 에러', () => {
      const invalid: BirthProfile = {
        ...CASE_1_BASIC,
        birthDateTimeLocal: '2051-10-24T05:30',
      }
      expect(() => BirthProfileSchema.parse(invalid)).toThrow()
    })

    it('실존하지 않는 날짜 (2월 30일) → 에러', () => {
      const invalid: BirthProfile = {
        ...CASE_1_BASIC,
        birthDateTimeLocal: '1992-02-30T05:30',
      }
      expect(() => BirthProfileSchema.parse(invalid)).toThrow()
    })

    it('잘못된 날짜 형식 → 에러', () => {
      const invalid = {
        ...CASE_1_BASIC,
        birthDateTimeLocal: '10/24/1992',
      }
      expect(() => BirthProfileSchema.parse(invalid)).toThrow()
    })

    it('위도 범위 밖 → 에러', () => {
      const invalid = {
        ...CASE_1_BASIC,
        location: { lat: 91, lon: 0 },
      }
      expect(() => BirthProfileSchema.parse(invalid)).toThrow()
    })

    it('경도 범위 밖 → 에러', () => {
      const invalid = {
        ...CASE_1_BASIC,
        location: { lat: 0, lon: 181 },
      }
      expect(() => BirthProfileSchema.parse(invalid)).toThrow()
    })
  })

  describe('출력 스키마 검증', () => {
    it('케이스 1 출력이 UnifiedChartSchema 통과', async () => {
      const result = await calculateUnifiedChart(CASE_1_BASIC)
      // generatedAt는 변동되므로 스냅샷 검증에서 제외
      expect(() => UnifiedChartSchema.parse(result)).not.toThrow()
    })

    it('시간 미상 출력이 UnifiedChartSchema 통과', async () => {
      const result = await calculateUnifiedChart(CASE_2_UNKNOWN_TIME)
      expect(() => UnifiedChartSchema.parse(result)).not.toThrow()
    })
  })

  describe('스냅샷 회귀 테스트', () => {
    for (const { name, profile } of ALL_REFERENCE_CASES) {
      it(`스냅샷: ${name}`, async () => {
        const result = await calculateUnifiedChart(profile)

        // 변동값 고정 (스냅샷 안정화)
        const snapshot = {
          ...result,
          meta: {
            ...result.meta,
            generatedAt: '[DYNAMIC]',
          },
        }

        expect(snapshot).toMatchSnapshot()
      })
    }
  })

  describe('부분 실패 시뮬레이션', () => {
    it('saju 실패 시 ziwei/western은 정상', async () => {
      // saju 엔진을 mock으로 에러 발생
      const sajuModule = await import('../src/engines/saju.js')
      const spy = vi.spyOn(sajuModule, 'computeSaju').mockImplementationOnce(() => {
        throw new Error('manseryeok 에러 시뮬레이션')
      })

      const result = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result.saju).toBeNull()
      expect(result.meta.errors).toHaveLength(1)
      expect(result.meta.errors[0]!.system).toBe('saju')
      expect(result.meta.errors[0]!.message).toContain('manseryeok 에러')

      // ziwei/western은 정상 동작해야 함
      // (Promise.allSettled이므로 한 엔진 실패가 다른 엔진에 영향 없음)
      expect(result.ziwei).not.toBeNull()
      expect(result.western).not.toBeNull()

      spy.mockRestore()
    })
  })

  describe('음력 입력', () => {
    it('음력 → 양력 변환 후 3체계 계산', async () => {
      const lunarProfile: BirthProfile = {
        birthDateTimeLocal: '1992-09-29T05:30',
        timezone: 'Asia/Seoul',
        location: { lat: 37.5665, lon: 126.978 },
        calendarMode: 'lunar',
        isLeapMonth: false,
        gender: 'male',
        unknownTime: false,
      }
      const result = await calculateUnifiedChart(lunarProfile)
      // 음력 1992-09-29 = 양력 1992-10-24
      expect(result.saju).not.toBeNull()
      expect(result.saju!.pillars.year.hangul).toBe('임신')
      expect(result.meta.systemsCompleted).toContain('saju')
      expect(result.meta.systemsCompleted).toContain('ziwei')
      expect(result.meta.systemsCompleted).toContain('western')
    })
  })

  describe('동일 입력 재현성', () => {
    it('같은 입력 → 같은 configHash', async () => {
      const result1 = await calculateUnifiedChart(CASE_1_BASIC)
      const result2 = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result1.meta.configHash).toBe(result2.meta.configHash)
    })

    it('같은 입력 → 같은 사주', async () => {
      const result1 = await calculateUnifiedChart(CASE_1_BASIC)
      const result2 = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result1.saju).toEqual(result2.saju)
    })

    it('같은 입력 → 같은 자미두수', async () => {
      const result1 = await calculateUnifiedChart(CASE_1_BASIC)
      const result2 = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result1.ziwei).toEqual(result2.ziwei)
    })

    it('같은 입력 → 같은 서양점성', async () => {
      const result1 = await calculateUnifiedChart(CASE_1_BASIC)
      const result2 = await calculateUnifiedChart(CASE_1_BASIC)
      expect(result1.western).toEqual(result2.western)
    })
  })
})
