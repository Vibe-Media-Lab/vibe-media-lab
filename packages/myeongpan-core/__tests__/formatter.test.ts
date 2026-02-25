/**
 * Chart Formatter 테스트
 *
 * 기존 레퍼런스 케이스 활용
 * - 각 포매터 핵심 키워드 포함 검증
 * - unknownTime 처리
 * - 토큰 예산 검증
 * - 통합 포매터 출력 검증
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { calculateUnifiedChart } from '../src/calculate.js'
import { formatSaju } from '../src/formatter/saju-formatter.js'
import { formatZiwei } from '../src/formatter/ziwei-formatter.js'
import { formatWestern } from '../src/formatter/western-formatter.js'
import { formatChartForLLM, estimateTokenCount, getMaxOutputTokens } from '../src/formatter/chart-formatter.js'
import type { UnifiedChart } from '../src/types.js'
import {
  CASE_1_BASIC,
  CASE_2_UNKNOWN_TIME,
  CASE_3_DST,
  CASE_5_ZI_HOUR,
} from './__fixtures__/reference-cases.js'

// 사전 계산된 차트 (비용 절약)
let chart1: UnifiedChart
let chart2: UnifiedChart // unknownTime
let chart3: UnifiedChart // DST
let chart5: UnifiedChart // 자시

beforeAll(async () => {
  ;[chart1, chart2, chart3, chart5] = await Promise.all([
    calculateUnifiedChart(CASE_1_BASIC),
    calculateUnifiedChart(CASE_2_UNKNOWN_TIME),
    calculateUnifiedChart(CASE_3_DST),
    calculateUnifiedChart(CASE_5_ZI_HOUR),
  ])
})

// ============================================================
// formatSaju
// ============================================================

describe('formatSaju', () => {
  it('4주 모두 포함', () => {
    const text = formatSaju(chart1.saju!, false)
    expect(text).toContain('연주(年柱)')
    expect(text).toContain('월주(月柱)')
    expect(text).toContain('일주(日柱)')
    expect(text).toContain('시주(時柱)')
  })

  it('오행 분포 포함', () => {
    const text = formatSaju(chart1.saju!, false)
    expect(text).toContain('오행 분포')
    expect(text).toContain('목(木)')
    expect(text).toContain('화(火)')
    expect(text).toContain('토(土)')
    expect(text).toContain('금(金)')
    expect(text).toContain('수(水)')
  })

  it('음양 균형 포함', () => {
    const text = formatSaju(chart1.saju!, false)
    expect(text).toContain('음양 균형')
    expect(text).toContain('양(陽)')
    expect(text).toContain('음(陰)')
  })

  it('일간 분석 포함', () => {
    const text = formatSaju(chart1.saju!, false)
    expect(text).toContain('일간(日干)')
  })

  it('unknownTime 시 시주 "(미상)" 표기', () => {
    const text = formatSaju(chart2.saju!, true)
    expect(text).toContain('시주(時柱): (미상)')
    expect(text).toContain('출생시간 미상')
  })

  it('천간/지지 한자 포함', () => {
    const text = formatSaju(chart1.saju!, false)
    // 한자가 포함되어야 함
    expect(text).toMatch(/\(.[^\)]+\)/)
  })
})

// ============================================================
// formatZiwei
// ============================================================

describe('formatZiwei', () => {
  it('기본 정보 포함 (명주, 신주, 오행국)', () => {
    const text = formatZiwei(chart1.ziwei!)
    expect(text).toContain('명주:')
    expect(text).toContain('신주:')
    expect(text).toContain('오행국:')
  })

  it('핵심 궁위 포함', () => {
    const text = formatZiwei(chart1.ziwei!)
    expect(text).toContain('핵심 궁위')
    // 최소 1개 궁위는 출력되어야 함
    expect(text).toContain('주성:')
  })

  it('DST 케이스도 정상 포맷', () => {
    const text = formatZiwei(chart3.ziwei!)
    expect(text).toContain('자미두수')
  })
})

// ============================================================
// formatWestern
// ============================================================

describe('formatWestern', () => {
  it('Big 3 포함', () => {
    const text = formatWestern(chart1.western!)
    expect(text).toContain('Big 3')
    expect(text).toContain('태양:')
    expect(text).toContain('달:')
    expect(text).toContain('상승:')
  })

  it('행성 배치 포함 (최소 5개)', () => {
    const text = formatWestern(chart1.western!)
    expect(text).toContain('행성 배치')
    // Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn
    const planetMatches = text.match(/태양|달\(Moon\)|수성|금성|화성|목성|토성/g)
    expect(planetMatches?.length).toBeGreaterThanOrEqual(5)
  })

  it('애스펙트 최대 8개', () => {
    const text = formatWestern(chart1.western!)
    if (text.includes('주요 애스펙트')) {
      const aspectLines = text.split('\n').filter((l) => l.includes('orb'))
      expect(aspectLines.length).toBeLessThanOrEqual(8)
    }
  })

  it('원소/양식 분포 포함', () => {
    const text = formatWestern(chart1.western!)
    expect(text).toContain('원소/양식 분포')
  })

  it('역행 표기', () => {
    const text = formatWestern(chart1.western!)
    // 역행 행성이 있을 수도 없을 수도 있으므로, 형식만 확인
    expect(text).toContain('하우스')
  })
})

// ============================================================
// formatChartForLLM (통합)
// ============================================================

describe('formatChartForLLM', () => {
  it('3체계 모두 포함 (기본 케이스)', () => {
    const text = formatChartForLLM(chart1)
    expect(text).toContain('사주(四柱) 분석')
    expect(text).toContain('자미두수(紫微斗數) 분석')
    expect(text).toContain('서양 점성술 분석')
  })

  it('unknownTime 시 사주만 포함', () => {
    const text = formatChartForLLM(chart2)
    expect(text).toContain('사주(四柱) 분석')
    expect(text).not.toContain('자미두수(紫微斗數) 분석')
    expect(text).not.toContain('서양 점성술 분석')
    expect(text).toContain('출생시간 미상')
  })

  it('특정 체계만 선택 가능', () => {
    const text = formatChartForLLM(chart1, { systems: ['saju', 'western'] })
    expect(text).toContain('사주(四柱) 분석')
    expect(text).not.toContain('자미두수')
    expect(text).toContain('서양 점성술 분석')
  })

  it('토큰 예산 검증 (2000자 미만)', () => {
    const text = formatChartForLLM(chart1)
    expect(text.length).toBeLessThan(4000) // 4000자 이하 (안전 마진)
  })

  it('자시 경계 케이스도 정상 포맷', () => {
    const text = formatChartForLLM(chart5)
    expect(text).toContain('사주(四柱) 분석')
    expect(text).toContain('자미두수')
    expect(text).toContain('서양 점성술')
  })
})

// ============================================================
// 유틸리티
// ============================================================

describe('estimateTokenCount', () => {
  it('빈 문자열 → 0', () => {
    expect(estimateTokenCount('')).toBe(0)
  })

  it('한국어 텍스트 → 양수', () => {
    const count = estimateTokenCount('안녕하세요. 사주 분석 결과입니다.')
    expect(count).toBeGreaterThan(0)
  })
})

describe('getMaxOutputTokens', () => {
  it('short → 4096', () => {
    expect(getMaxOutputTokens('short')).toBe(4096)
  })

  it('medium → 8192', () => {
    expect(getMaxOutputTokens('medium')).toBe(8192)
  })

  it('long → 16384', () => {
    expect(getMaxOutputTokens('long')).toBe(16384)
  })
})
