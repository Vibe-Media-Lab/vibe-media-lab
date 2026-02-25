import { describe, it, expect } from 'vitest'
import { computeWestern } from '../src/engines/western.js'
import type { WesternInput } from '../src/input/normalize.js'

describe('computeWestern', () => {
  describe('기본 계산 (1992-10-24 05:30 서울)', () => {
    const input: WesternInput = {
      year: 1992, month: 10, day: 24,
      hour: 5, minute: 30,
      timezone: 9,
      latitude: 37.5665, longitude: 126.978,
      houseSystem: 'placidus',
    }

    it('행성 목록 반환 (최소 10개)', () => {
      const result = computeWestern(input)
      expect(result.planets.length).toBeGreaterThanOrEqual(10)
    })

    it('Sun 행성 포함', () => {
      const result = computeWestern(input)
      const sun = result.planets.find((p) => p.name === 'Sun')
      expect(sun).toBeDefined()
    })

    it('Moon 행성 포함', () => {
      const result = computeWestern(input)
      const moon = result.planets.find((p) => p.name === 'Moon')
      expect(moon).toBeDefined()
    })

    it('태양 별자리 = Scorpio (10월 24일)', () => {
      const result = computeWestern(input)
      expect(result.sunSign).toBe('Scorpio')
    })

    it('달 별자리 존재', () => {
      const result = computeWestern(input)
      expect(result.moonSign).toBeTruthy()
      expect(result.moonSign).not.toBe('Unknown')
    })

    it('상승 별자리 존재', () => {
      const result = computeWestern(input)
      expect(result.risingSign).toBeTruthy()
    })

    it('12 하우스 커스프', () => {
      const result = computeWestern(input)
      expect(result.houses.cusps).toHaveLength(12)
    })

    it('하우스 시스템 = Placidus', () => {
      const result = computeWestern(input)
      expect(result.houses.system).toBe('Placidus')
    })

    it('4 앵글 모두 존재', () => {
      const result = computeWestern(input)
      expect(result.angles.ascendant).toBeDefined()
      expect(result.angles.midheaven).toBeDefined()
      expect(result.angles.descendant).toBeDefined()
      expect(result.angles.imumCoeli).toBeDefined()
    })

    it('ASC 앵글 구조', () => {
      const result = computeWestern(input)
      const asc = result.angles.ascendant
      expect(asc.name).toBe('Ascendant')
      expect(asc.abbrev).toBe('ASC')
      expect(asc.longitude).toBeGreaterThanOrEqual(0)
      expect(asc.longitude).toBeLessThan(360)
      expect(asc.sign).toBeTruthy()
      expect(asc.formatted).toBeTruthy()
    })

    it('애스펙트 배열 반환', () => {
      const result = computeWestern(input)
      expect(Array.isArray(result.aspects)).toBe(true)
    })

    it('애스펙트 구조', () => {
      const result = computeWestern(input)
      if (result.aspects.length > 0) {
        const aspect = result.aspects[0]!
        expect(aspect).toHaveProperty('body1')
        expect(aspect).toHaveProperty('body2')
        expect(aspect).toHaveProperty('type')
        expect(aspect).toHaveProperty('angle')
        expect(aspect).toHaveProperty('orb')
      }
    })

    it('행성 구조 상세', () => {
      const result = computeWestern(input)
      const sun = result.planets.find((p) => p.name === 'Sun')!
      expect(sun.longitude).toBeGreaterThanOrEqual(0)
      expect(sun.longitude).toBeLessThan(360)
      expect(sun.sign).toBeTruthy()
      expect(sun.degree).toBeGreaterThanOrEqual(0)
      expect(sun.degree).toBeLessThan(30)
      expect(sun.formatted).toBeTruthy()
      expect(sun.house).toBeGreaterThanOrEqual(1)
      expect(sun.house).toBeLessThanOrEqual(12)
    })

    it('원소 분포 반환', () => {
      const result = computeWestern(input)
      expect(result.elements).toBeDefined()
      expect(result.elements).toHaveProperty('fire')
      expect(result.elements).toHaveProperty('earth')
      expect(result.elements).toHaveProperty('air')
      expect(result.elements).toHaveProperty('water')
    })

    it('양식 분포 반환', () => {
      const result = computeWestern(input)
      expect(result.modalities).toBeDefined()
      expect(result.modalities).toHaveProperty('cardinal')
      expect(result.modalities).toHaveProperty('fixed')
      expect(result.modalities).toHaveProperty('mutable')
    })

    it('패턴 배열 반환', () => {
      const result = computeWestern(input)
      expect(Array.isArray(result.patterns)).toBe(true)
    })
  })

  describe('DST 시간대 (뉴욕)', () => {
    it('EDT (UTC-4) 차트 계산', () => {
      const input: WesternInput = {
        year: 2000, month: 8, day: 16,
        hour: 14, minute: 0,
        timezone: -4,
        latitude: 40.7128, longitude: -74.006,
        houseSystem: 'placidus',
      }
      const result = computeWestern(input)
      expect(result.sunSign).toBe('Leo') // 8월 16일
      expect(result.planets.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('자정 경계', () => {
    it('00:00 차트 계산', () => {
      const input: WesternInput = {
        year: 1990, month: 1, day: 1,
        hour: 0, minute: 0,
        timezone: 0,
        latitude: 51.5074, longitude: -0.1278,
        houseSystem: 'placidus',
      }
      const result = computeWestern(input)
      expect(result.sunSign).toBe('Capricorn') // 1월 1일
      expect(result.houses.cusps).toHaveLength(12)
    })
  })

  describe('역행 감지', () => {
    it('isRetrograde 필드 존재', () => {
      const input: WesternInput = {
        year: 1992, month: 10, day: 24,
        hour: 5, minute: 30,
        timezone: 9,
        latitude: 37.5665, longitude: 126.978,
        houseSystem: 'placidus',
      }
      const result = computeWestern(input)
      for (const planet of result.planets) {
        expect(typeof planet.isRetrograde).toBe('boolean')
      }
    })
  })
})
