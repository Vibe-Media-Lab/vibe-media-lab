import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractErrorMessage, validateRequestBody, buildBaseRequest, simpleFetch } from '../kids/_shared'
import { z } from 'zod'
import type { StepActionContext } from '../types'

// ============================================================
// Helpers
// ============================================================

function mockContext(overrides?: Partial<StepActionContext>): StepActionContext {
  return {
    inputContext: {},
    sessionId: 'test-session',
    projectId: null,
    stepId: 'test-step',
    value: null,
    config: { previewType: 'text', generateAction: 'kids/story' },
    ...overrides,
  }
}

// ============================================================
// extractErrorMessage
// ============================================================

describe('extractErrorMessage', () => {
  it('returns string error directly', () => {
    expect(extractErrorMessage({ error: '뭔가 잘못됨' }, 'fallback')).toBe('뭔가 잘못됨')
  })

  it('returns object error message', () => {
    expect(extractErrorMessage({ error: { message: '인증 실패' } }, 'fallback')).toBe('인증 실패')
  })

  it('returns fallback when error is missing', () => {
    expect(extractErrorMessage({}, 'API 오류')).toBe('API 오류')
  })

  it('returns fallback when error is null', () => {
    expect(extractErrorMessage({ error: null }, 'fallback')).toBe('fallback')
  })

  it('returns fallback when error is number', () => {
    expect(extractErrorMessage({ error: 500 }, 'fallback')).toBe('fallback')
  })

  it('includes Zod-style issues in message', () => {
    const error = {
      message: '검증 실패',
      details: {
        issues: [
          { path: ['sessionId'], message: 'Required' },
          { path: ['topic'], message: 'Too short' },
        ],
      },
    }
    const result = extractErrorMessage({ error }, 'fallback')
    expect(result).toContain('검증 실패')
    expect(result).toContain('sessionId: Required')
    expect(result).toContain('topic: Too short')
  })

  it('includes all issues in message (no truncation)', () => {
    const issues = Array.from({ length: 7 }, (_, i) => ({
      path: [`field${i}`],
      message: `Error ${i}`,
    }))
    const error = { message: '검증 실패', details: { issues } }
    const result = extractErrorMessage({ error }, 'fallback')
    expect(result).toContain('field0: Error 0')
    expect(result).toContain('field6: Error 6')
  })

  it('handles issues with empty path', () => {
    const error = {
      message: '실패',
      details: {
        issues: [{ path: [], message: 'Root error' }],
      },
    }
    const result = extractErrorMessage({ error }, 'fallback')
    expect(result).toContain(': Root error')
  })
})

// ============================================================
// validateRequestBody
// ============================================================

describe('validateRequestBody', () => {
  const TestSchema = z.object({
    sessionId: z.string(),
    topic: z.string().min(1),
  })

  it('passes for valid data', () => {
    expect(() => validateRequestBody({ sessionId: 's1', topic: 'test' }, TestSchema)).not.toThrow()
  })

  it('throws on missing required field', () => {
    expect(() => validateRequestBody({ sessionId: 's1' }, TestSchema)).toThrow('요청 데이터 검증 실패')
  })

  it('throws on wrong type', () => {
    expect(() => validateRequestBody({ sessionId: 123, topic: 'test' }, TestSchema)).toThrow('요청 데이터 검증 실패')
  })

  it('includes field path in error message', () => {
    try {
      validateRequestBody({ sessionId: 's1' }, TestSchema)
    } catch (e) {
      expect((e as Error).message).toContain('topic')
    }
  })

  it('truncates beyond 5 issues with count', () => {
    const BigSchema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
      d: z.string(),
      e: z.string(),
      f: z.string(),
      g: z.string(),
    })
    try {
      validateRequestBody({}, BigSchema)
    } catch (e) {
      expect((e as Error).message).toContain('(외')
    }
  })
})

// ============================================================
// buildBaseRequest
// ============================================================

describe('buildBaseRequest', () => {
  it('extracts setup and story data', () => {
    const ctx = mockContext({
      inputContext: {
        setup: { topic: '동물 친구들', formFactor: 'shortform', style: 'disney' },
        story: {
          data: { success: true, data: { sessionId: 'story-session-1', story: {} } },
          generatedAt: new Date(),
        },
      },
      sessionId: '',
    })

    const result = buildBaseRequest(ctx)
    expect(result.topic).toBe('동물 친구들')
    expect(result.formFactor).toBe('shortform')
    expect(result.style).toBe('disney')
    expect(result.sessionId).toBe('story-session-1')
  })

  it('uses DEFAULT_KIDS_SETUP when setup is missing', () => {
    const ctx = mockContext({ inputContext: {} })
    const result = buildBaseRequest(ctx)
    expect(result.topic).toBe('')
    expect(result.formFactor).toBe('longform')
    expect(result.style).toBe('pixar')
  })

  it('prefers ctx.sessionId over story sessionId', () => {
    const ctx = mockContext({
      sessionId: 'override-session',
      inputContext: {
        story: {
          data: { success: true, data: { sessionId: 'story-session' } },
          generatedAt: new Date(),
        },
      },
    })
    const result = buildBaseRequest(ctx)
    expect(result.sessionId).toBe('override-session')
  })

  it('auto-generates sessionId when empty', () => {
    const ctx = mockContext({ sessionId: '', inputContext: {} })
    const result = buildBaseRequest(ctx)
    expect(result.sessionId).toMatch(/^session-\d+$/)
  })

  it('includes projectId when present', () => {
    const ctx = mockContext({ projectId: 'proj-1' })
    const result = buildBaseRequest(ctx)
    expect(result.projectId).toBe('proj-1')
  })

  it('excludes projectId when null', () => {
    const ctx = mockContext({ projectId: null })
    const result = buildBaseRequest(ctx)
    expect(result.projectId).toBeUndefined()
  })
})

// ============================================================
// simpleFetch
// ============================================================

describe('simpleFetch', () => {
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns JSON on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: '1' } }),
    })

    const result = await simpleFetch('/api/test', { key: 'value' })
    expect(result).toEqual({ success: true, data: { id: '1' } })
    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    })
  })

  it('throws with extracted error message on !ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: '잘못된 요청입니다' }),
    })

    await expect(simpleFetch('/api/test', {})).rejects.toThrow('잘못된 요청입니다')
  })

  it('falls back to status message when json parse fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('parse error') },
    })

    await expect(simpleFetch('/api/test', {})).rejects.toThrow('API 오류: 500')
  })
})
