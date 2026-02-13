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

const SHOTS_DATA = [
  { id: 'shot-1', shotNumber: 1, duration: 10, imageUrl: 'https://img1.png', visualPrompt: 'p1' },
  { id: 'shot-2', shotNumber: 2, duration: 10, imageUrl: 'https://img2.png', visualPrompt: 'p2' },
]

function mockContext(overrides?: Partial<StepActionContext>): StepActionContext {
  return {
    inputContext: {
      setup: { topic: '숲 속 동물 친구들', formFactor: 'longform', style: 'pixar' },
      story: {
        data: { success: true, data: { sessionId: 'story-session', story: {} } },
        generatedAt: new Date(),
      },
      shots: {
        data: {
          success: true,
          data: { sessionId: 'shots-session', shots: SHOTS_DATA },
        },
        generatedAt: new Date(),
      },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'videos',
    value: null,
    config: { previewType: 'video-timeline', generateAction: 'kids/videos' },
    ...overrides,
  }
}

describe('videosAction', () => {
  const action = getAction('kids/videos')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey and endpoint', () => {
      expect(action.actionKey).toBe('kids/videos')
      expect(action.endpoint).toBe('/api/kids-animation/videos')
    })

    it('has null requestSchema (per-shot validation)', () => {
      expect(action.requestSchema).toBeNull()
    })
  })

  describe('buildRequestBody', () => {
    it('includes shots from inputContext', () => {
      const body = action.buildRequestBody(mockContext())
      expect(body.shots).toEqual(SHOTS_DATA)
    })

    it('returns empty array when no shots data', () => {
      const body = action.buildRequestBody(mockContext({ inputContext: {} }))
      expect(body.shots).toEqual([])
    })
  })

  describe('execute', () => {
    it('throws when shots is empty', async () => {
      const ctx = mockContext({ inputContext: {} })
      await expect(action.execute(ctx, mockCallbacks())).rejects.toThrow('비디오 생성할 샷 데이터가 없습니다')
    })

    it('processes shots sequentially', async () => {
      // Shot 1 success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { videoUrl: 'https://vid1.mp4' } }),
      })
      // Shot 2 success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { videoUrl: 'https://vid2.mp4' } }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(callbacks.onChange).toHaveBeenCalled()
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')

      const result = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(result.data.data.shots[0].videoUrl).toBe('https://vid1.mp4')
      expect(result.data.data.shots[1].videoUrl).toBe('https://vid2.mp4')
    })

    it('continues when individual shot fails', async () => {
      // Shot 1 fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: '비디오 생성 실패' }),
      })
      // Shot 2 success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { videoUrl: 'https://vid2.mp4' } }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      // Both attempted
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Error message set
      expect(callbacks.setError).toHaveBeenCalledWith(expect.stringContaining('1개 비디오 생성 실패'))

      // Still completes
      const result = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(result.data.data.shots[0].videoUrl).toBe('')
      expect(result.data.data.shots[1].videoUrl).toBe('https://vid2.mp4')
    })

    it('calls setCompletedUrls for successful shots', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { videoUrl: 'https://vid1.mp4' } }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { videoUrl: 'https://vid2.mp4' } }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.setCompletedUrls).toHaveBeenCalledTimes(2)
    })

    it('does not call setCompletedUrls for failed shots', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { videoUrl: 'https://vid2.mp4' } }),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.setCompletedUrls).toHaveBeenCalledTimes(1) // only shot-2
    })

    it('reports failure count in error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.setError).toHaveBeenCalledWith(expect.stringContaining('2개 비디오 생성 실패'))
    })
  })

  describe('regenerateItem', () => {
    it('is defined', () => {
      expect(action.regenerateItem).toBeDefined()
    })

    it('regenerates a single video', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { videoUrl: 'https://new-vid.mp4' } }),
      })

      const ctx = mockContext({
        value: {
          data: {
            success: true,
            data: {
              sessionId: 'test',
              shots: [
                { id: 'shot-1', shotNumber: 1, videoUrl: 'https://old.mp4' },
                { id: 'shot-2', shotNumber: 2, videoUrl: 'https://old2.mp4' },
              ],
            },
          },
          generatedAt: new Date(),
        },
      })

      const callbacks = mockRegenCallbacks()
      await action.regenerateItem!('shot-1', undefined, ctx, callbacks)

      const result = (callbacks.onChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(result.data.data.shots[0].videoUrl).toBe('https://new-vid.mp4')
      expect(result.data.data.shots[1].videoUrl).toBe('https://old2.mp4')
    })

    it('throws when original shot not found', async () => {
      const ctx = mockContext({
        value: {
          data: { success: true, data: { shots: [] } },
          generatedAt: new Date(),
        },
      })

      await expect(
        action.regenerateItem!('nonexistent', undefined, ctx, mockRegenCallbacks()),
      ).rejects.toThrow('원본 샷 데이터를 찾을 수 없습니다')
    })

    it('throws when no video URL returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { videoUrl: '' } }),
      })

      const ctx = mockContext({
        value: {
          data: {
            success: true,
            data: {
              sessionId: 't',
              shots: [{ id: 'shot-1', shotNumber: 1, videoUrl: 'old' }],
            },
          },
          generatedAt: new Date(),
        },
      })

      await expect(
        action.regenerateItem!('shot-1', undefined, ctx, mockRegenCallbacks()),
      ).rejects.toThrow('비디오 URL이 반환되지 않았습니다')
    })
  })
})
