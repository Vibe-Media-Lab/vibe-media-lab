import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAction } from '../registry'
import type { StepActionContext, StepCallbacks } from '../types'

// ============================================================
// Helpers
// ============================================================

function mockCallbacks(): StepCallbacks {
  return {
    setStatus: vi.fn(),
    setProgress: vi.fn(),
    setError: vi.fn(),
    onChange: vi.fn(),
    setCompletedUrls: vi.fn(),
  }
}

function mockContext(overrides?: Partial<StepActionContext>): StepActionContext {
  return {
    inputContext: {
      setup: { topic: '숲 속 동물 친구들', formFactor: 'longform', style: 'pixar' },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'story',
    value: null,
    config: { previewType: 'text', generateAction: 'kids/story' },
    ...overrides,
  }
}

// ============================================================
// Tests
// ============================================================

describe('storyAction', () => {
  const action = getAction('kids/story')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey', () => {
      expect(action.actionKey).toBe('kids/story')
    })

    it('has correct endpoint', () => {
      expect(action.endpoint).toBe('/api/kids-animation/story')
    })

    it('has a request schema', () => {
      expect(action.requestSchema).not.toBeNull()
    })
  })

  describe('buildRequestBody', () => {
    it('extracts setup data correctly', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      expect(body.topic).toBe('숲 속 동물 친구들')
      expect(body.formFactor).toBe('longform')
      expect(body.style).toBe('pixar')
      expect(body.sessionId).toBe('test-session')
    })

    it('uses defaults when setup is missing', () => {
      const ctx = mockContext({ inputContext: {} })
      const body = action.buildRequestBody(ctx)

      expect(body.topic).toBe('')
      expect(body.formFactor).toBe('longform')
      expect(body.style).toBe('pixar')
    })
  })

  describe('execute', () => {
    it('calls API and triggers onChange + setStatus', async () => {
      const storyData = {
        success: true,
        data: {
          sessionId: 'test-session',
          story: { title: '숲 속 모험', characters: [] },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => storyData,
      })

      const callbacks = mockCallbacks()
      const ctx = mockContext()

      await action.execute(ctx, callbacks)

      expect(mockFetch).toHaveBeenCalledOnce()
      expect(callbacks.onChange).toHaveBeenCalledWith({
        data: storyData,
        generatedAt: expect.any(Date),
      })
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')
    })

    it('updates progress to processing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.setProgress).toHaveBeenCalled()
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: '서버 오류' }),
      })

      const callbacks = mockCallbacks()

      await expect(action.execute(mockContext(), callbacks)).rejects.toThrow('서버 오류')
    })
  })

  describe('regenerateItem', () => {
    it('is not defined (story has no item regeneration)', () => {
      expect(action.regenerateItem).toBeUndefined()
    })
  })
})
