import { describe, it, expect } from 'vitest'
import { computeZiwei } from '../src/engines/ziwei.js'
import type { ZiweiInput } from '../src/input/normalize.js'

describe('computeZiwei', () => {
  describe('기본 계산 (1992-10-24 인시 남성)', () => {
    const input: ZiweiInput = {
      dateStr: '1992-10-24',
      timeIndex: 2, // 인시 (03-05)
      gender: '남',
      fixLeap: true,
    }

    it('12궁 반환', () => {
      const result = computeZiwei(input)
      expect(result.palaces).toHaveLength(12)
    })

    it('각 궁에 index 0-11', () => {
      const result = computeZiwei(input)
      const indices = result.palaces.map((p) => p.index)
      expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    })

    it('각 궁에 name 존재', () => {
      const result = computeZiwei(input)
      for (const palace of result.palaces) {
        expect(palace.name).toBeTruthy()
      }
    })

    it('각 궁에 천간/지지 존재', () => {
      const result = computeZiwei(input)
      for (const palace of result.palaces) {
        expect(palace.heavenlyStem).toBeTruthy()
        expect(palace.earthlyBranch).toBeTruthy()
      }
    })

    it('주성이 포함된 궁 존재', () => {
      const result = computeZiwei(input)
      const hasMainStars = result.palaces.some((p) => p.majorStars.length > 0)
      expect(hasMainStars).toBe(true)
    })

    it('부성이 포함된 궁 존재', () => {
      const result = computeZiwei(input)
      const hasMinorStars = result.palaces.some((p) => p.minorStars.length > 0)
      expect(hasMinorStars).toBe(true)
    })

    it('12장생 존재', () => {
      const result = computeZiwei(input)
      for (const palace of result.palaces) {
        expect(palace.changsheng12).toBeTruthy()
      }
    })

    it('대한 범위 존재', () => {
      const result = computeZiwei(input)
      const hasDecadal = result.palaces.some((p) => p.decadal !== null)
      expect(hasDecadal).toBe(true)
    })

    it('명궁 지지 반환', () => {
      const result = computeZiwei(input)
      expect(result.soulPalaceEarthlyBranch).toBeTruthy()
    })

    it('신궁 지지 반환', () => {
      const result = computeZiwei(input)
      expect(result.bodyPalaceEarthlyBranch).toBeTruthy()
    })

    it('명주/신주 반환', () => {
      const result = computeZiwei(input)
      expect(result.soul).toBeTruthy()
      expect(result.body).toBeTruthy()
    })

    it('오행국 반환', () => {
      const result = computeZiwei(input)
      expect(result.fiveElementsClass).toBeTruthy()
    })

    it('성별 반환', () => {
      const result = computeZiwei(input)
      expect(result.gender).toBe('남')
    })

    it('띠/별자리 반환', () => {
      const result = computeZiwei(input)
      expect(result.zodiac).toBeTruthy()
      expect(result.sign).toBeTruthy()
    })
  })

  describe('여성 케이스', () => {
    it('여성 차트 계산', () => {
      const input: ZiweiInput = {
        dateStr: '2000-8-16',
        timeIndex: 7, // 오시 (11-13시 중 14시에 가까운 미시(7))
        gender: '여',
        fixLeap: true,
      }
      const result = computeZiwei(input)
      expect(result.gender).toBe('여')
      expect(result.palaces).toHaveLength(12)
    })
  })

  describe('star 구조 검증', () => {
    it('주성에 name/type/brightness/mutagen 존재', () => {
      const input: ZiweiInput = {
        dateStr: '1992-10-24',
        timeIndex: 2,
        gender: '남',
        fixLeap: true,
      }
      const result = computeZiwei(input)
      const palaceWithMajor = result.palaces.find((p) => p.majorStars.length > 0)!
      const star = palaceWithMajor.majorStars[0]!
      expect(star).toHaveProperty('name')
      expect(star).toHaveProperty('type')
      expect(star).toHaveProperty('brightness')
      expect(star).toHaveProperty('mutagen')
      expect(star.type).toBe('major')
    })
  })

  describe('시진별 차트 변화', () => {
    it('다른 시진 → 다른 궁 배치', () => {
      const input1: ZiweiInput = {
        dateStr: '1992-10-24', timeIndex: 2, gender: '남', fixLeap: true,
      }
      const input2: ZiweiInput = {
        dateStr: '1992-10-24', timeIndex: 6, gender: '남', fixLeap: true,
      }
      const result1 = computeZiwei(input1)
      const result2 = computeZiwei(input2)

      // 시진이 다르면 명궁 위치가 달라야 함
      expect(result1.soulPalaceEarthlyBranch).not.toBe(result2.soulPalaceEarthlyBranch)
    })
  })
})
