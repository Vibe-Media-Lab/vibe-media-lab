import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAction } from '../registry'
import type { StepActionContext, StepCallbacks } from '../types'

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
      archetype: { archetype: 'bright-3d-boy', freeText: undefined },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'quickstart',
    value: null,
    config: { previewType: 'character-quickstart', generateAction: 'character/quickstart' },
    ...overrides,
  }
}

describe('quickstartAction', () => {
  const action = getAction('character/quickstart')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey', () => {
      expect(action.actionKey).toBe('character/quickstart')
    })

    it('has correct endpoint', () => {
      expect(action.endpoint).toBe('/api/character/quickstart')
    })

    it('has a request schema', () => {
      expect(action.requestSchema).not.toBeNull()
    })
  })

  describe('buildRequestBody', () => {
    it('extracts archetype data correctly', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      expect(body.archetype).toBe('bright-3d-boy')
      expect(body.sessionId).toBe('test-session')
    })

    it('extracts freeText when archetype is freetext', () => {
      const ctx = mockContext({
        inputContext: {
          archetype: { archetype: 'freetext', freeText: '날개 달린 고양이' },
        },
      })
      const body = action.buildRequestBody(ctx)

      expect(body.archetype).toBe('freetext')
      expect(body.freeText).toBe('날개 달린 고양이')
    })

    it('uses defaults when archetype is missing', () => {
      const ctx = mockContext({ inputContext: {} })
      const body = action.buildRequestBody(ctx)

      expect(body.archetype).toBe('')
    })
  })

  describe('execute', () => {
    it('calls API and triggers onChange + setStatus', async () => {
      const profileData = {
        success: true,
        data: {
          sessionId: 'test-session',
          profile: {
            name: '아라곤',
            personality: '용감한 전사',
            visualDescription: 'A brave warrior',
            backstory: '전사 배경',
            archetype: 'bright-3d-boy',
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => profileData,
      })

      const callbacks = mockCallbacks()
      const ctx = mockContext()

      await action.execute(ctx, callbacks)

      expect(mockFetch).toHaveBeenCalledOnce()
      expect(callbacks.onChange).toHaveBeenCalledWith({
        data: profileData,
        generatedAt: expect.any(Date),
      })
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')
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

  describe('validation', () => {
    it('throws when freetext archetype has empty freeText', async () => {
      const ctx = mockContext({
        inputContext: {
          archetype: { archetype: 'freetext', freeText: '' },
        },
      })
      const callbacks = mockCallbacks()

      await expect(action.execute(ctx, callbacks)).rejects.toThrow()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws when freetext archetype has no freeText', async () => {
      const ctx = mockContext({
        inputContext: {
          archetype: { archetype: 'freetext', freeText: undefined },
        },
      })
      const callbacks = mockCallbacks()

      await expect(action.execute(ctx, callbacks)).rejects.toThrow()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('regenerateItem', () => {
    it('is not defined (quickstart has no item regeneration)', () => {
      expect(action.regenerateItem).toBeUndefined()
    })
  })
})
