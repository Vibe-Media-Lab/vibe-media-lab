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
      'main-visual': {
        data: {
          success: true,
          data: {
            sessionId: 'test-session',
            images: [
              { id: 'portrait-1', url: 'https://example.com/1.png', prompt: 'test1' },
              { id: 'portrait-2', url: 'https://example.com/2.png', prompt: 'test2' },
            ],
            selectedImageId: 'portrait-1',
            selectedImageUrl: 'https://example.com/1.png',
          },
        },
        generatedAt: new Date(),
      },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'character-sheet',
    value: null,
    config: { previewType: 'character-profile', generateAction: 'character/character-sheet', batchSize: 4 },
    ...overrides,
  }
}

describe('characterSheetAction', () => {
  const action = getAction('character/character-sheet')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey', () => {
      expect(action.actionKey).toBe('character/character-sheet')
    })

    it('has correct endpoint', () => {
      expect(action.endpoint).toBe('/api/character/character-sheet')
    })

    it('has a request schema', () => {
      expect(action.requestSchema).not.toBeNull()
    })
  })

  describe('buildRequestBody', () => {
    it('extracts selectedImageUrl from main-visual data', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      expect(body.selectedImageUrl).toBe('https://example.com/1.png')
    })

    it('extracts character profile from quickstart data', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      const profile = body.characterProfile as Record<string, string>
      expect(profile.name).toBe('아라곤')
      expect(profile.visualDescription).toBe('A brave warrior with silver armor')
    })

    it('uses empty values when context is missing', () => {
      const ctx = mockContext({ inputContext: {} })
      const body = action.buildRequestBody(ctx)

      expect(body.selectedImageUrl).toBe('')
      const profile = body.characterProfile as Record<string, string>
      expect(profile.name).toBe('')
    })

    it('finds selectedImageUrl by id when direct url is missing', () => {
      const ctx = mockContext({
        inputContext: {
          ...mockContext().inputContext,
          'main-visual': {
            data: {
              success: true,
              data: {
                sessionId: 'test-session',
                images: [
                  { id: 'portrait-1', url: 'https://example.com/1.png' },
                  { id: 'portrait-2', url: 'https://example.com/2.png' },
                ],
                selectedImageId: 'portrait-2',
              },
            },
            generatedAt: new Date(),
          },
        },
      })
      const body = action.buildRequestBody(ctx)

      expect(body.selectedImageUrl).toBe('https://example.com/2.png')
    })

    it('includes model when selectedModel is set', () => {
      const ctx = mockContext({ selectedModel: 'fal-ai/nano-banana-pro/edit' })
      const body = action.buildRequestBody(ctx)

      expect(body.model).toBe('fal-ai/nano-banana-pro/edit')
    })
  })

  describe('execute', () => {
    it('calls API and triggers onChange + setStatus', async () => {
      const sheetData = {
        success: true,
        data: {
          sessionId: 'test-session',
          selectedImageUrl: 'https://example.com/1.png',
          characterName: '아라곤',
          characterDescription: 'A brave warrior',
          sheets: [
            { id: 'front_view', url: 'https://example.com/front.png', variation: '정면' },
            { id: 'three_quarter', url: 'https://example.com/3q.png', variation: '3/4 뷰' },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sheetData,
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(mockFetch).toHaveBeenCalledOnce()
      expect(callbacks.onChange).toHaveBeenCalledWith({
        data: sheetData,
        generatedAt: expect.any(Date),
      })
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')
    })

    it('throws when selectedImageUrl is missing (Zod validation)', async () => {
      const ctx = mockContext({ inputContext: {} })
      const callbacks = mockCallbacks()

      await expect(action.execute(ctx, callbacks)).rejects.toThrow('요청 데이터 검증 실패')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: '시트 생성 실패' }),
      })

      const callbacks = mockCallbacks()
      await expect(action.execute(mockContext(), callbacks)).rejects.toThrow('시트 생성 실패')
    })

    it('initializes progress with 4 variation items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { sheets: [] } }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.setProgress).toHaveBeenCalled()
      const progressCall = (callbacks.setProgress as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Function
      const result = progressCall({ items: [], current: 0, total: 0, message: '', stepId: 'character-sheet', status: 'idle' })
      expect(result.total).toBe(4)
      expect(result.items).toHaveLength(4)
    })
  })

  describe('regenerateItem', () => {
    it('is not defined', () => {
      expect(action.regenerateItem).toBeUndefined()
    })
  })
})
