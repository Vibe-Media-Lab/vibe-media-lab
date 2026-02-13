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

const SCRIPT_SHOTS = [
  {
    id: 'shot-1',
    shotNumber: 1,
    duration: 10,
    narration: 'Once upon a time...',
    visualPrompt: 'A rabbit in a forest',
    characters: ['토끼'],
    location: '숲',
    emotion: 'happy',
  },
  {
    id: 'shot-2',
    shotNumber: 2,
    duration: 10,
    narration: 'The adventure begins...',
    visualPrompt: 'A rabbit running through the woods',
  },
]

function mockContext(overrides?: Partial<StepActionContext>): StepActionContext {
  return {
    inputContext: {
      setup: { topic: '숲 속 동물 친구들', formFactor: 'longform', style: 'pixar' },
      story: {
        data: { success: true, data: { sessionId: 'story-session', story: {} } },
        generatedAt: new Date(),
      },
      script: {
        data: {
          success: true,
          data: {
            sessionId: 'script-session',
            script: { shots: SCRIPT_SHOTS, bgmPrompt: 'happy music' },
            anchorPrompts: [],
          },
        },
        generatedAt: new Date(),
      },
      anchors: {
        mode: 'generate' as const,
        generated: [
          { id: 'char-1', url: 'https://example.com/rabbit.png', category: 'character' as const, label: '토끼' },
          { id: 'bg-1', url: 'https://example.com/forest.png', category: 'background' as const, label: '숲' },
        ],
      },
      expand: {
        data: {
          success: true,
          data: {
            sessionId: 'expand-session',
            expanded: [
              { id: 'exp-1', originalId: 'char-1', category: 'character', name: '토끼', variation: 'happy', url: 'https://example.com/happy.png' },
            ],
            stats: { total: 1, success: 1, failed: 0 },
          },
        },
        generatedAt: new Date(),
      },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'shots',
    value: null,
    config: { previewType: 'shot-gallery', generateAction: 'kids/shots' },
    ...overrides,
  }
}

describe('shotsAction', () => {
  const action = getAction('kids/shots')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey and endpoint', () => {
      expect(action.actionKey).toBe('kids/shots')
      expect(action.endpoint).toBe('/api/kids-animation/shots')
    })
  })

  describe('buildRequestBody', () => {
    it('includes sanitized script with shots', () => {
      const body = action.buildRequestBody(mockContext())
      const script = body.script as { shots: Array<{ id: string; shotNumber: number }> }

      expect(script.shots).toHaveLength(2)
      expect(script.shots[0]!.shotNumber).toBe(1)
    })

    it('fixes missing shotNumber with index+1', () => {
      const ctx = mockContext({
        inputContext: {
          ...mockContext().inputContext,
          script: {
            data: {
              success: true,
              data: {
                sessionId: 's1',
                script: {
                  shots: [
                    { id: 'shot-1', duration: 10, narration: 'n', visualPrompt: 'v' },
                  ],
                },
                anchorPrompts: [],
              },
            },
            generatedAt: new Date(),
          },
        },
      })

      const body = action.buildRequestBody(ctx)
      const script = body.script as { shots: Array<{ shotNumber: number }> }
      expect(script.shots[0]!.shotNumber).toBe(1)
    })

    it('includes anchors and expanded data', () => {
      const body = action.buildRequestBody(mockContext())

      expect(body.anchors).toHaveLength(2)
      expect(body.expanded).toHaveLength(1)
    })

    it('includes model when selected', () => {
      const body = action.buildRequestBody(mockContext({ selectedModel: 'gemini-3-pro-image' }))
      expect(body.model).toBe('gemini-3-pro-image')
    })
  })

  describe('execute', () => {
    it('calls API and returns result', async () => {
      const shotsResult = {
        success: true,
        data: {
          shots: [
            { id: 'shot-1', shotNumber: 1, imageUrl: 'https://img.png' },
            { id: 'shot-2', shotNumber: 2, imageUrl: 'https://img2.png' },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => shotsResult,
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.onChange).toHaveBeenCalledWith({
        data: shotsResult,
        generatedAt: expect.any(Date),
      })
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')
    })

    it('updates progress items to processing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { shots: [] } }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.setProgress).toHaveBeenCalled()
    })
  })

  describe('regenerateItem', () => {
    it('is defined', () => {
      expect(action.regenerateItem).toBeDefined()
    })

    it('sends regenerate request with correct visual prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { imageUrl: 'https://new-img.png' } }),
      })

      const ctx = mockContext({
        value: {
          data: {
            success: true,
            data: {
              shots: [
                { id: 'shot-1', shotNumber: 1, visualPrompt: 'original prompt', imageUrl: 'https://old.png' },
              ],
            },
          },
          generatedAt: new Date(),
        },
      })

      const callbacks = mockRegenCallbacks()
      await action.regenerateItem!('shot-1', undefined, ctx, callbacks)

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.shotId).toBe('shot-1')
      expect(body.visualPrompt).toBe('A rabbit in a forest') // from script shots
    })

    it('uses editedPrompt when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { imageUrl: 'https://new-img.png' } }),
      })

      const ctx = mockContext({
        value: {
          data: {
            success: true,
            data: {
              shots: [
                { id: 'shot-1', shotNumber: 1, visualPrompt: 'original', imageUrl: 'https://old.png' },
              ],
            },
          },
          generatedAt: new Date(),
        },
      })

      const callbacks = mockRegenCallbacks()
      await action.regenerateItem!('shot-1', 'edited prompt', ctx, callbacks)

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.visualPrompt).toBe('edited prompt')
    })

    it('performs immutable update on shot imageUrl', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { imageUrl: 'https://new-shot.png' } }),
      })

      const ctx = mockContext({
        value: {
          data: {
            success: true,
            data: {
              shots: [
                { id: 'shot-1', shotNumber: 1, visualPrompt: 'p', imageUrl: 'https://old.png' },
                { id: 'shot-2', shotNumber: 2, visualPrompt: 'p2', imageUrl: 'https://old2.png' },
              ],
            },
          },
          generatedAt: new Date(),
        },
      })

      const callbacks = mockRegenCallbacks()
      await action.regenerateItem!('shot-1', undefined, ctx, callbacks)

      const onChangeData = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      const shots = onChangeData.data.data.shots
      expect(shots[0].imageUrl).toBe('https://new-shot.png')
      expect(shots[1].imageUrl).toBe('https://old2.png') // unchanged
    })

    it('throws when shot is not found', async () => {
      const ctx = mockContext({
        value: {
          data: { success: true, data: { shots: [] } },
          generatedAt: new Date(),
        },
      })

      await expect(
        action.regenerateItem!('nonexistent', undefined, ctx, mockRegenCallbacks()),
      ).rejects.toThrow()
    })

    it('throws when no image URL returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { imageUrl: '' } }),
      })

      const ctx = mockContext({
        value: {
          data: {
            success: true,
            data: {
              shots: [{ id: 'shot-1', shotNumber: 1, visualPrompt: 'p', imageUrl: 'old' }],
            },
          },
          generatedAt: new Date(),
        },
      })

      await expect(
        action.regenerateItem!('shot-1', undefined, ctx, mockRegenCallbacks()),
      ).rejects.toThrow('이미지 URL이 반환되지 않았습니다')
    })
  })
})
