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

function mockRegenCallbacks() {
  return {
    ...mockCallbacks(),
    setRegeneratingItemId: vi.fn(),
  }
}

const ANCHOR_PROMPTS = [
  { id: 'char-1', category: 'character' as const, name: '토끼', prompt: 'cute white rabbit' },
  { id: 'bg-1', category: 'background' as const, name: '숲', prompt: 'magical forest' },
]

function mockContext(overrides?: Partial<StepActionContext>): StepActionContext {
  return {
    inputContext: {
      setup: { topic: '숲 속 동물 친구들', formFactor: 'longform', style: 'pixar' },
      script: {
        data: {
          success: true,
          data: {
            sessionId: 'script-session',
            script: { shots: [] },
            anchorPrompts: ANCHOR_PROMPTS,
          },
        },
        generatedAt: new Date(),
      },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'anchors',
    value: null,
    config: { previewType: 'image-grid', generateAction: 'kids/anchors' },
    ...overrides,
  }
}

describe('anchorsAction', () => {
  const action = getAction('kids/anchors')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey', () => {
      expect(action.actionKey).toBe('kids/anchors')
    })

    it('has correct endpoint', () => {
      expect(action.endpoint).toBe('/api/kids-animation/anchors')
    })

    it('has a request schema', () => {
      expect(action.requestSchema).not.toBeNull()
    })
  })

  describe('buildRequestBody', () => {
    it('extracts anchorPrompts from script', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      expect(body.anchorPrompts).toEqual(ANCHOR_PROMPTS)
    })

    it('includes model when selected', () => {
      const ctx = mockContext({ selectedModel: 'gemini-3-pro-image' })
      const body = action.buildRequestBody(ctx)

      expect(body.model).toBe('gemini-3-pro-image')
    })

    it('returns empty array when script is missing', () => {
      const ctx = mockContext({ inputContext: {} })
      const body = action.buildRequestBody(ctx)

      expect(body.anchorPrompts).toEqual([])
    })

    it('includes base request fields', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      expect(body.sessionId).toBe('test-session')
      expect(body.formFactor).toBe('longform')
      expect(body.style).toBe('pixar')
    })
  })

  describe('execute', () => {
    it('throws when anchorPrompts is empty', async () => {
      const ctx = mockContext({ inputContext: {} })
      const callbacks = mockCallbacks()

      await expect(action.execute(ctx, callbacks)).rejects.toThrow('앵커 프롬프트가 없습니다')
    })

    it('calls API and returns result on success', async () => {
      const apiResponse = {
        success: true,
        data: {
          anchors: [
            { id: 'char-1', category: 'character', name: '토끼', originalUrl: 'https://example.com/rabbit.png', dbId: 'db-1' },
            { id: 'bg-1', category: 'background', name: '숲', originalUrl: 'https://example.com/forest.png', dbId: 'db-2' },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse,
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(mockFetch).toHaveBeenCalledOnce()
      expect(callbacks.onChange).toHaveBeenCalledWith({
        data: apiResponse,
        generatedAt: expect.any(Date),
      })
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')
    })

    it('updates progress with anchor items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { anchors: [] } }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.setProgress).toHaveBeenCalled()
      const progressFn = (callbacks.setProgress as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      const result = progressFn({
        stepId: 'anchors', status: 'idle', current: 0, total: 0, message: '', items: [],
      })
      expect(result.items).toHaveLength(2)
      expect(result.items[0].label).toBe('토끼')
      expect(result.items[1].label).toBe('숲')
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: '이미지 생성 실패' }),
      })

      await expect(action.execute(mockContext(), mockCallbacks())).rejects.toThrow('이미지 생성 실패')
    })

    it('sends correct request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { anchors: [] } }),
      })

      await action.execute(mockContext(), mockCallbacks())

      const [url, options] = mockFetch.mock.calls[0]!
      expect(url).toBe('/api/kids-animation/anchors')
      const body = JSON.parse(options.body)
      expect(body.anchorPrompts).toEqual(ANCHOR_PROMPTS)
      expect(body.sessionId).toBe('test-session')
    })
  })

  describe('regenerateItem', () => {
    it('is defined', () => {
      expect(action.regenerateItem).toBeDefined()
    })

    it('sends single anchorPrompt for the target item', async () => {
      const apiResponse = {
        data: {
          anchors: [
            { id: 'char-1', originalUrl: 'https://example.com/new-rabbit.png', dbId: 'db-new' },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse,
      })

      const ctx = mockContext({
        value: {
          data: {
            anchors: [
              { id: 'char-1', originalUrl: 'https://example.com/old.png', category: 'character', name: '토끼' },
              { id: 'bg-1', originalUrl: 'https://example.com/forest.png', category: 'background', name: '숲' },
            ],
          },
          generatedAt: new Date(),
        },
      })

      const callbacks = mockRegenCallbacks()
      await action.regenerateItem!('char-1', undefined, ctx, callbacks)

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.anchorPrompts).toHaveLength(1)
      expect(body.anchorPrompts[0].id).toBe('char-1')
    })

    it('throws when target prompt is not found', async () => {
      const ctx = mockContext()
      const callbacks = mockRegenCallbacks()

      await expect(
        action.regenerateItem!('nonexistent', undefined, ctx, callbacks),
      ).rejects.toThrow('앵커 프롬프트를 찾을 수 없습니다')
    })

    it('performs immutable update on the changed anchor only', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            anchors: [
              { id: 'char-1', originalUrl: 'https://new-url.com/rabbit.png', dbId: 'db-99' },
            ],
          },
        }),
      })

      const existingAnchors = [
        { id: 'char-1', originalUrl: 'https://old.com/rabbit.png', category: 'character', name: '토끼', dbId: 'db-1' },
        { id: 'bg-1', originalUrl: 'https://old.com/forest.png', category: 'background', name: '숲', dbId: 'db-2' },
      ]

      const ctx = mockContext({
        value: {
          data: { anchors: existingAnchors },
          generatedAt: new Date(),
        },
      })

      const callbacks = mockRegenCallbacks()
      await action.regenerateItem!('char-1', undefined, ctx, callbacks)

      const onChangeCall = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      const updatedAnchors = onChangeCall.data.anchors

      // char-1 updated
      expect(updatedAnchors[0].originalUrl).toBe('https://new-url.com/rabbit.png')
      expect(updatedAnchors[0].dbId).toBe('db-99')
      // bg-1 unchanged
      expect(updatedAnchors[1].originalUrl).toBe('https://old.com/forest.png')
      expect(updatedAnchors[1].dbId).toBe('db-2')
    })

    it('calls setRegeneratingItemId(null) on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { anchors: [{ id: 'char-1', originalUrl: 'url', dbId: 'db' }] },
        }),
      })

      const ctx = mockContext({
        value: {
          data: { anchors: [{ id: 'char-1', originalUrl: 'old', category: 'character', name: '토끼' }] },
          generatedAt: new Date(),
        },
      })

      const callbacks = mockRegenCallbacks()
      await action.regenerateItem!('char-1', undefined, ctx, callbacks)

      expect(callbacks.setRegeneratingItemId).toHaveBeenCalledWith(null)
    })

    it('throws when no regenerated anchor is returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { anchors: [] } }),
      })

      const ctx = mockContext({
        value: {
          data: { anchors: [{ id: 'char-1' }] },
          generatedAt: new Date(),
        },
      })

      await expect(
        action.regenerateItem!('char-1', undefined, ctx, mockRegenCallbacks()),
      ).rejects.toThrow('재생성된 앵커 데이터가 없습니다')
    })
  })
})
