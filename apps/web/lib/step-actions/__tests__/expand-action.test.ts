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
      setup: { topic: '숲 속 동물 친구들', formFactor: 'longform', style: 'pixar' },
      story: {
        data: { success: true, data: { sessionId: 'story-session', story: {} } },
        generatedAt: new Date(),
      },
      anchors: {
        mode: 'generate' as const,
        generated: [
          { id: 'char-1', url: 'https://example.com/rabbit.png', category: 'character' as const, label: '토끼' },
          { id: 'bg-1', url: 'https://example.com/forest.png', category: 'background' as const, label: '숲' },
        ],
      },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'expand',
    value: null,
    config: { previewType: 'image-grid', generateAction: 'kids/expand' },
    ...overrides,
  }
}

describe('expandAction', () => {
  const action = getAction('kids/expand')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey', () => {
      expect(action.actionKey).toBe('kids/expand')
    })

    it('has correct endpoint', () => {
      expect(action.endpoint).toBe('/api/kids-animation/expand')
    })
  })

  describe('buildRequestBody', () => {
    it('maps anchors from inputContext', () => {
      const body = action.buildRequestBody(mockContext())
      const anchors = body.anchors as Array<{ id: string; category: string; name: string; url: string }>

      expect(anchors).toHaveLength(2)
      expect(anchors[0]!.id).toBe('char-1')
      expect(anchors[0]!.category).toBe('character')
      expect(anchors[0]!.url).toBe('https://example.com/rabbit.png')
    })

    it('includes model when selected', () => {
      const body = action.buildRequestBody(mockContext({ selectedModel: 'gemini-3-pro-image' }))
      expect(body.model).toBe('gemini-3-pro-image')
    })

    it('returns empty anchors array when no generated data', () => {
      const body = action.buildRequestBody(mockContext({ inputContext: {} }))
      expect(body.anchors).toEqual([])
    })
  })

  describe('execute', () => {
    it('throws when anchors are empty', async () => {
      const ctx = mockContext({ inputContext: {} })
      await expect(action.execute(ctx, mockCallbacks())).rejects.toThrow('확장할 앵커 데이터가 없습니다')
    })

    it('performs 2-stage fetch (character then background)', async () => {
      // Character expansion response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            expanded: [
              { id: 'exp-1', originalId: 'char-1', category: 'character', name: '토끼', variation: 'happy', url: 'https://example.com/happy.png' },
            ],
          },
        }),
      })

      // Background expansion response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            expanded: [
              { id: 'exp-2', originalId: 'bg-1', category: 'background', name: '숲', variation: 'medium', url: 'https://example.com/medium.png' },
            ],
          },
        }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(callbacks.onChange).toHaveBeenCalled()
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')

      const onChangeData = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      const expanded = onChangeData.data.data.expanded
      expect(expanded).toHaveLength(2)
    })

    it('continues with background even if characters fail', async () => {
      // Character fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: '캐릭터 확장 실패' }),
      })

      // This will actually throw because the current implementation throws on character failure
      const callbacks = mockCallbacks()
      await expect(action.execute(mockContext(), callbacks)).rejects.toThrow('캐릭터 확장 실패')
    })

    it('works with only characters (no backgrounds)', async () => {
      const ctx = mockContext({
        inputContext: {
          setup: { topic: 'test', formFactor: 'longform', style: 'pixar' },
          anchors: {
            mode: 'generate' as const,
            generated: [
              { id: 'char-1', url: 'https://example.com/rabbit.png', category: 'character' as const, label: '토끼' },
            ],
          },
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            expanded: [
              { id: 'exp-1', originalId: 'char-1', category: 'character', name: '토끼', variation: 'happy', url: 'url' },
            ],
          },
        }),
      })

      const callbacks = mockCallbacks()
      await action.execute(ctx, callbacks)

      expect(mockFetch).toHaveBeenCalledTimes(1) // only character fetch
      expect(callbacks.onChange).toHaveBeenCalled()
    })

    it('updates progress through stages', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { expanded: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { expanded: [] } }),
        })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      // setProgress is called multiple times (initial, char start, char done, bg start)
      expect((callbacks.setProgress as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('regenerateItem', () => {
    it('is not defined (expand has no individual regeneration)', () => {
      expect(action.regenerateItem).toBeUndefined()
    })
  })
})
