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
              visualDescriptions: [
                'A brave warrior with silver armor',
                'A brave warrior with warm golden armor and red cape',
                'A brave warrior with cool blue steel armor',
                'A brave warrior with minimalist white armor',
              ],
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
            selectedVisualDescription: 'A brave warrior with silver armor',
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

    it('uses selectedVisualDescription snapshot from main-visual', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)
      const profile = body.characterProfile as Record<string, string>
      expect(profile.visualDescription).toBe('A brave warrior with silver armor')
    })

    it('falls back to quickstart visualDescription when snapshot is missing', () => {
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
                selectedImageId: 'portrait-1',
                selectedImageUrl: 'https://example.com/1.png',
                // selectedVisualDescription 없음 (하위 호환)
              },
            },
            generatedAt: new Date(),
          },
        },
      })
      const body = action.buildRequestBody(ctx)
      const profile = body.characterProfile as Record<string, string>
      expect(profile.visualDescription).toBe('A brave warrior with silver armor')
    })

    it('passes description of selected portrait, not first', () => {
      const ctx = mockContext({
        inputContext: {
          ...mockContext().inputContext,
          'main-visual': {
            data: {
              success: true,
              data: {
                sessionId: 'test-session',
                images: [
                  { id: 'portrait-1', url: 'https://example.com/1.png', prompt: 'desc1' },
                  { id: 'portrait-2', url: 'https://example.com/2.png', prompt: 'desc2' },
                ],
                selectedImageId: 'portrait-2',
                selectedImageUrl: 'https://example.com/2.png',
                selectedVisualDescription: 'A brave warrior with warm golden armor and red cape',
              },
            },
            generatedAt: new Date(),
          },
        },
      })
      const body = action.buildRequestBody(ctx)
      const profile = body.characterProfile as Record<string, string>
      expect(profile.visualDescription).toBe('A brave warrior with warm golden armor and red cape')
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
            { id: 'front_view', url: 'https://example.com/front.png', variation: '정면', status: 'completed' },
            { id: 'three_quarter', url: 'https://example.com/3q.png', variation: '3/4 뷰', status: 'completed' },
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
      const progressCall = (callbacks.setProgress as ReturnType<typeof vi.fn>).mock.calls[0]![0] as (prev: Record<string, unknown>) => Record<string, unknown>
      const result = progressCall({ items: [], current: 0, total: 0, message: '', stepId: 'character-sheet', status: 'idle' })
      expect(result.total).toBe(4)
      expect(result.items).toHaveLength(4)
    })

    it('updates progress with item statuses after API response', async () => {
      const sheetData = {
        success: true,
        data: {
          sessionId: 'test-session',
          selectedImageUrl: 'https://example.com/1.png',
          characterName: '아라곤',
          characterDescription: 'A brave warrior',
          sheets: [
            { id: 'front_view', url: 'https://example.com/front.png', variation: '정면', status: 'completed' },
            { id: 'three_quarter', url: '', variation: '3/4 뷰', status: 'failed' },
            { id: 'happy_expression', url: 'https://example.com/happy.png', variation: '행복 표정', status: 'completed' },
            { id: 'action_pose', url: 'https://example.com/action.png', variation: '액션 포즈', status: 'completed' },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sheetData,
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      // setProgress: 초기화 + 상태 반영
      expect(callbacks.setProgress).toHaveBeenCalledTimes(2)

      const statusCall = (callbacks.setProgress as ReturnType<typeof vi.fn>).mock.calls[1]![0] as (prev: Record<string, unknown>) => Record<string, unknown>
      const result = statusCall({
        items: [
          { id: 'front_view', label: '정면', status: 'processing' },
          { id: 'three_quarter', label: '3/4 뷰', status: 'processing' },
          { id: 'happy_expression', label: '행복 표정', status: 'processing' },
          { id: 'action_pose', label: '액션 포즈', status: 'processing' },
        ],
        current: 0,
        total: 4,
        message: '',
        stepId: 'character-sheet',
        status: 'idle',
      })

      expect(result.current).toBe(3)
      const items = result.items as Array<{ status: string }>
      expect(items[1]!.status).toBe('failed')
    })
  })

  describe('regenerateItem', () => {
    it('is defined', () => {
      expect(action.regenerateItem).toBeDefined()
    })

    it('sends regenerateVariationId to API and updates single sheet', async () => {
      const newSheet = { id: 'three_quarter', url: 'https://example.com/new-3q.png', variation: '3/4 뷰', status: 'completed' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            sessionId: 'test-session',
            selectedImageUrl: 'https://example.com/1.png',
            characterName: '아라곤',
            characterDescription: 'A brave warrior',
            sheets: [newSheet],
          },
        }),
      })

      const ctx = mockContext({
        value: {
          data: {
            success: true,
            data: {
              sessionId: 'test-session',
              selectedImageUrl: 'https://example.com/1.png',
              characterName: '아라곤',
              characterDescription: 'A brave warrior',
              sheets: [
                { id: 'front_view', url: 'https://example.com/front.png', variation: '정면' },
                { id: 'three_quarter', url: 'https://example.com/old-3q.png', variation: '3/4 뷰' },
              ],
            },
          },
          generatedAt: new Date(),
        },
      })

      const setRegeneratingItemId = vi.fn()
      const callbacks = { ...mockCallbacks(), setRegeneratingItemId }

      await action.regenerateItem!('three_quarter', undefined, ctx, callbacks)

      // API call includes regenerateVariationId
      const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string)
      expect(callBody.regenerateVariationId).toBe('three_quarter')

      // onChange called with updated sheet
      expect(callbacks.onChange).toHaveBeenCalledOnce()
      const updatedData = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      const innerData = updatedData.data.data
      expect(innerData.sheets[1].url).toBe('https://example.com/new-3q.png')
      // front_view unchanged
      expect(innerData.sheets[0].url).toBe('https://example.com/front.png')

      expect(setRegeneratingItemId).toHaveBeenCalledWith(null)
    })

    it('handles edited data format (after handleEdit)', async () => {
      const newSheet = { id: 'front_view', url: 'https://example.com/new-front.png', variation: '정면', status: 'completed' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            sessionId: 'test-session',
            selectedImageUrl: 'https://example.com/1.png',
            characterName: '아라곤',
            characterDescription: 'A brave warrior',
            sheets: [newSheet],
          },
        }),
      })

      // After unwrap: sheets are at data.sheets (not data.data.sheets)
      const ctx = mockContext({
        value: {
          data: {
            sheets: [
              { id: 'front_view', url: 'https://example.com/old-front.png', variation: '정면' },
              { id: 'three_quarter', url: 'https://example.com/3q.png', variation: '3/4 뷰' },
            ],
            selectedImageUrl: 'https://example.com/1.png',
          },
          generatedAt: new Date(),
        },
      })

      const setRegeneratingItemId = vi.fn()
      const callbacks = { ...mockCallbacks(), setRegeneratingItemId }

      await action.regenerateItem!('front_view', undefined, ctx, callbacks)

      const updatedData = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(updatedData.data.sheets[0].url).toBe('https://example.com/new-front.png')
      expect(updatedData.data.sheets[1].url).toBe('https://example.com/3q.png')
    })

    it('throws when API returns no sheet', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            sessionId: 'test-session',
            selectedImageUrl: 'https://example.com/1.png',
            characterName: '아라곤',
            characterDescription: 'A brave warrior',
            sheets: [],
          },
        }),
      })

      const ctx = mockContext({
        value: {
          data: { success: true, data: { sheets: [] } },
          generatedAt: new Date(),
        },
      })

      const setRegeneratingItemId = vi.fn()
      const callbacks = { ...mockCallbacks(), setRegeneratingItemId }

      await expect(
        action.regenerateItem!('front_view', undefined, ctx, callbacks)
      ).rejects.toThrow('재생성된 시트가 없습니다')
    })
  })
})
