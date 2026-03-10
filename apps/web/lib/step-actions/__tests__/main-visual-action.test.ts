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
      quickstart: {
        data: {
          success: true,
          data: {
            sessionId: 'test-session',
            profile: {
              name: '아라곤',
              personality: '용감한 전사',
              visualDescription: 'A brave warrior with silver armor',
              backstory: '전사 배경',
              archetype: 'warrior',
            },
          },
        },
        generatedAt: new Date(),
      },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'main-visual',
    value: null,
    config: { previewType: 'image-select', generateAction: 'character/main-visual', batchSize: 4 },
    ...overrides,
  }
}

describe('mainVisualAction', () => {
  const action = getAction('character/main-visual')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey', () => {
      expect(action.actionKey).toBe('character/main-visual')
    })

    it('has correct endpoint', () => {
      expect(action.endpoint).toBe('/api/character/main-visual')
    })

    it('has a request schema', () => {
      expect(action.requestSchema).not.toBeNull()
    })
  })

  describe('buildRequestBody', () => {
    it('extracts character profile from quickstart data', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      expect(body.characterProfile).toBeDefined()
      const profile = body.characterProfile as Record<string, string>
      expect(profile.name).toBe('아라곤')
      expect(profile.visualDescription).toBe('A brave warrior with silver armor')
    })

    it('uses default empty profile when quickstart is missing', () => {
      const ctx = mockContext({ inputContext: {} })
      const body = action.buildRequestBody(ctx)

      const profile = body.characterProfile as Record<string, string>
      expect(profile.name).toBe('')
    })

    it('includes count from config.batchSize', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      expect(body.count).toBe(4)
    })

    it('includes model when selectedModel is set', () => {
      const ctx = mockContext({ selectedModel: 'nano-banana-pro' })
      const body = action.buildRequestBody(ctx)

      expect(body.model).toBe('nano-banana-pro')
    })
  })

  describe('execute', () => {
    it('calls API and triggers onChange + setStatus', async () => {
      const imageData = {
        success: true,
        data: {
          sessionId: 'test-session',
          images: [
            { id: 'portrait-1', url: 'https://example.com/1.png', prompt: 'test' },
            { id: 'portrait-2', url: 'https://example.com/2.png', prompt: 'test' },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => imageData,
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(mockFetch).toHaveBeenCalledOnce()
      expect(callbacks.onChange).toHaveBeenCalledWith({
        data: imageData,
        generatedAt: expect.any(Date),
      })
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')
    })

    it('initializes progress with batch items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { images: [] } }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.setProgress).toHaveBeenCalled()
      const progressCall = (callbacks.setProgress as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Function
      const result = progressCall({ items: [], current: 0, total: 0, message: '', stepId: 'main-visual', status: 'idle' })
      expect(result.total).toBe(4)
      expect(result.items).toHaveLength(4)
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: '이미지 생성 실패' }),
      })

      const callbacks = mockCallbacks()
      await expect(action.execute(mockContext(), callbacks)).rejects.toThrow('이미지 생성 실패')
    })
  })

  describe('regenerateItem', () => {
    it('is not defined', () => {
      expect(action.regenerateItem).toBeUndefined()
    })
  })
})
