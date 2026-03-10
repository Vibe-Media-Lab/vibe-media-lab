/**
 * Myeongpan API 스키마 테스트
 */

import { describe, it, expect } from 'vitest'
import { InterpretRequestSchema } from '../types'

describe('InterpretRequestSchema model 필드', () => {
  const validBase = {
    chartId: '550e8400-e29b-41d4-a716-446655440000',
    options: { tone: 'warm', length: 'medium' },
  }

  it('허용된 모델 통과 (gemini-3-flash-preview)', () => {
    const result = InterpretRequestSchema.safeParse({
      ...validBase,
      model: 'gemini-3-flash-preview',
    })
    expect(result.success).toBe(true)
  })

  it('허용된 모델 통과 (gemini-3.1-pro-preview)', () => {
    const result = InterpretRequestSchema.safeParse({
      ...validBase,
      model: 'gemini-3.1-pro-preview',
    })
    expect(result.success).toBe(true)
  })

  it('존재하지 않는 모델 거부 (gemini-3-pro-preview)', () => {
    const result = InterpretRequestSchema.safeParse({
      ...validBase,
      model: 'gemini-3-pro-preview',
    })
    expect(result.success).toBe(false)
  })

  it('허용되지 않은 모델 거부 (gpt-4o)', () => {
    const result = InterpretRequestSchema.safeParse({
      ...validBase,
      model: 'gpt-4o',
    })
    expect(result.success).toBe(false)
  })

  it('model 미전달 시 optional로 통과', () => {
    const result = InterpretRequestSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })
})
