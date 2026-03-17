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
            styleHint: {
              visualStyle: 'bright-3d',
              promptKeywords: ['Pixar 3D animation style'],
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
            { id: 'portrait-1', url: 'https://example.com/1.png', prompt: 'test', status: 'completed' },
            { id: 'portrait-2', url: 'https://example.com/2.png', prompt: 'test', status: 'completed' },
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
      const progressCall = (callbacks.setProgress as ReturnType<typeof vi.fn>).mock.calls[0]![0] as (prev: Record<string, unknown>) => Record<string, unknown>
      const result = progressCall({ items: [], current: 0, total: 0, message: '', stepId: 'main-visual', status: 'idle' })
      expect(result.total).toBe(4)
      expect(result.items).toHaveLength(4)
    })

    it('updates progress with item statuses after API response', async () => {
      const imageData = {
        success: true,
        data: {
          sessionId: 'test-session',
          images: [
            { id: 'portrait-1', url: 'https://example.com/1.png', prompt: 'test', status: 'completed' },
            { id: 'portrait-2', url: '', prompt: 'test', status: 'failed' },
            { id: 'portrait-3', url: 'https://example.com/3.png', prompt: 'test', status: 'completed' },
            { id: 'portrait-4', url: 'https://example.com/4.png', prompt: 'test', status: 'completed' },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => imageData,
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      // setProgress는 2번 호출됨: 초기화 + 상태 반영
      expect(callbacks.setProgress).toHaveBeenCalledTimes(2)

      const statusCall = (callbacks.setProgress as ReturnType<typeof vi.fn>).mock.calls[1]![0] as (prev: Record<string, unknown>) => Record<string, unknown>
      const result = statusCall({
        items: [
          { id: 'portrait-1', label: '초상화 #1', status: 'processing' },
          { id: 'portrait-2', label: '초상화 #2', status: 'processing' },
          { id: 'portrait-3', label: '초상화 #3', status: 'processing' },
          { id: 'portrait-4', label: '초상화 #4', status: 'processing' },
        ],
        current: 0,
        total: 4,
        message: '',
        stepId: 'main-visual',
        status: 'idle',
      })

      expect(result.current).toBe(3)
      const items = result.items as Array<{ status: string }>
      expect(items[0]!.status).toBe('completed')
      expect(items[1]!.status).toBe('failed')
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
    it('is defined', () => {
      expect(action.regenerateItem).toBeDefined()
    })

    it('sends regenerateIndex to API and updates single image', async () => {
      const newImage = { id: 'portrait-2', url: 'https://example.com/new-2.png', prompt: 'test', status: 'completed' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessionId: 'test-session', images: [newImage] },
        }),
      })

      const ctx = mockContext({
        value: {
          data: {
            success: true,
            data: {
              sessionId: 'test-session',
              images: [
                { id: 'portrait-1', url: 'https://example.com/1.png' },
                { id: 'portrait-2', url: 'https://example.com/old-2.png' },
              ],
            },
          },
          generatedAt: new Date(),
        },
      })

      const setRegeneratingItemId = vi.fn()
      const callbacks = { ...mockCallbacks(), setRegeneratingItemId }

      await action.regenerateItem!('portrait-2', undefined, ctx, callbacks)

      // API call includes regenerateIndex, count stays at original batchSize
      const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string)
      expect(callBody.regenerateIndex).toBe(1)
      expect(callBody.count).toBe(4)

      // onChange called with updated image
      expect(callbacks.onChange).toHaveBeenCalledOnce()
      const updatedData = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      const innerData = updatedData.data.data
      expect(innerData.images[1].url).toBe('https://example.com/new-2.png')
      // portrait-1 unchanged
      expect(innerData.images[0].url).toBe('https://example.com/1.png')

      expect(setRegeneratingItemId).toHaveBeenCalledWith(null)
    })

    it('handles edited data format (after handleEdit)', async () => {
      const newImage = { id: 'portrait-1', url: 'https://example.com/new-1.png', prompt: 'test', status: 'completed' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessionId: 'test-session', images: [newImage] },
        }),
      })

      // After handleEdit: images are at data.images (not data.data.images)
      const ctx = mockContext({
        value: {
          data: {
            images: [
              { id: 'portrait-1', url: 'https://example.com/old-1.png' },
              { id: 'portrait-2', url: 'https://example.com/2.png' },
            ],
            selectedImageId: 'portrait-1',
            selectedImageUrl: 'https://example.com/old-1.png',
          },
          generatedAt: new Date(),
        },
      })

      const setRegeneratingItemId = vi.fn()
      const callbacks = { ...mockCallbacks(), setRegeneratingItemId }

      await action.regenerateItem!('portrait-1', undefined, ctx, callbacks)

      const updatedData = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(updatedData.data.images[0].url).toBe('https://example.com/new-1.png')
      expect(updatedData.data.images[1].url).toBe('https://example.com/2.png')
    })

    it('throws when API returns no image', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessionId: 'test-session', images: [] },
        }),
      })

      const ctx = mockContext({
        value: {
          data: { success: true, data: { images: [] } },
          generatedAt: new Date(),
        },
      })

      const setRegeneratingItemId = vi.fn()
      const callbacks = { ...mockCallbacks(), setRegeneratingItemId }

      await expect(
        action.regenerateItem!('portrait-1', undefined, ctx, callbacks)
      ).rejects.toThrow('재생성된 이미지가 없습니다')
    })
  })
})
