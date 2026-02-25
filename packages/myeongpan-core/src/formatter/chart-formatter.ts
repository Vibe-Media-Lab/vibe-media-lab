/**
 * 통합 차트 포매터
 *
 * UnifiedChart → LLM 입력 텍스트 (~900-1200 토큰)
 * 사용 가능한 체계만 포함, unknownTime 자동 처리
 */

import type { UnifiedChart, InterpretationOptions } from '../types.js'
import { formatSaju } from './saju-formatter.js'
import { formatZiwei } from './ziwei-formatter.js'
import { formatWestern } from './western-formatter.js'

export interface FormatChartOptions {
  /** 포함할 체계 (비워두면 사용 가능한 전체) */
  systems?: ('saju' | 'ziwei' | 'western')[]
}

/**
 * UnifiedChart를 LLM이 이해하기 쉬운 구조화된 텍스트로 변환
 *
 * @param chart 통합 차트
 * @param options 포맷 옵션 (선택)
 * @returns 포맷된 텍스트 (마크다운)
 */
export function formatChartForLLM(chart: UnifiedChart, options?: FormatChartOptions): string {
  const sections: string[] = []
  const systemsToInclude = options?.systems || chart.meta.systemsCompleted
  const unknownTime = chart.meta.warnings.some((w) => w.includes('시간 미상'))

  // 헤더
  sections.push('# 출생 차트 데이터')
  sections.push('')
  sections.push(`사용 체계: ${systemsToInclude.join(', ')}`)
  if (unknownTime) {
    sections.push('⚠️ 출생시간 미상 — 시간 의존 해석 제한')
  }

  // 사주
  if (systemsToInclude.includes('saju') && chart.saju) {
    sections.push('')
    sections.push(formatSaju(chart.saju, unknownTime))
  }

  // 자미두수
  if (systemsToInclude.includes('ziwei') && chart.ziwei) {
    sections.push('')
    sections.push(formatZiwei(chart.ziwei))
  }

  // 서양 점성술
  if (systemsToInclude.includes('western') && chart.western) {
    sections.push('')
    sections.push(formatWestern(chart.western))
  }

  // 경고/에러
  if (chart.meta.errors.length > 0) {
    sections.push('')
    sections.push('### 계산 실패 체계')
    for (const err of chart.meta.errors) {
      sections.push(`- ${err.system}: 계산 실패 (데이터 미포함)`)
    }
  }

  return sections.join('\n')
}

/**
 * 포맷된 텍스트의 대략적인 토큰 수 추정
 * 한국어/한자 = ~1.5 토큰/글자, 영어/숫자 = ~0.25 토큰/단어
 */
export function estimateTokenCount(text: string): number {
  // 간이 추정: 글자수 기반 (한국어 주체이므로 보수적)
  return Math.ceil(text.length / 2)
}

/**
 * InterpretationOptions에서 maxOutputTokens 산출
 */
export function getMaxOutputTokens(length: InterpretationOptions['length']): number {
  switch (length) {
    case 'short':
      return 4096
    case 'medium':
      return 8192
    case 'long':
      return 16384
    default:
      return 8192
  }
}
