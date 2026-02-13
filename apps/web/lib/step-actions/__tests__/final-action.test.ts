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
        data: {
          success: true,
          data: {
            sessionId: 'story-session',
            story: {
              title: '숲 속 모험',
              synopsis: '토끼의 모험 이야기',
              characters: [
                { name: '토끼', visualDescription: 'white rabbit with blue eyes' },
              ],
            },
          },
        },
        generatedAt: new Date(),
      },
      script: {
        data: {
          success: true,
          data: {
            sessionId: 'script-session',
            script: {
              shots: [
                { id: 'shot-1', shotNumber: 1, duration: 10, narration: 'n', visualPrompt: 'p' },
              ],
              bgmPrompt: 'happy',
            },
            anchorPrompts: [],
          },
        },
        generatedAt: new Date(),
      },
      anchors: {
        mode: 'generate' as const,
        generated: [
          { id: 'char-1', url: 'https://example.com/rabbit.png', category: 'character' as const, label: '토끼' },
        ],
      },
      videos: {
        data: {
          success: true,
          data: {
            sessionId: 'vid-session',
            shots: [
              { id: 'shot-1', shotNumber: 1, videoUrl: 'https://vid1.mp4' },
            ],
          },
        },
        generatedAt: new Date(),
      },
      audio: {
        data: {
          success: true,
          data: {
            tts: [
              { id: 'tts-1', shotNumber: 1, audioUrl: 'https://tts1.mp3' },
            ],
            bgmTracks: [
              { url: 'https://bgm1.mp3' },
              { url: 'https://bgm2.mp3' },
            ],
          },
        },
        generatedAt: new Date(),
      },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'final',
    value: null,
    config: { previewType: 'video-player', generateAction: 'kids/final' },
    selectedBgmIndex: 0,
    ...overrides,
  }
}

describe('finalAction', () => {
  const action = getAction('kids/final')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey and endpoint', () => {
      expect(action.actionKey).toBe('kids/final')
      expect(action.endpoint).toBe('/api/kids-animation/final')
    })

    it('has a request schema', () => {
      expect(action.requestSchema).not.toBeNull()
    })
  })

  describe('buildRequestBody', () => {
    it('merges video and audio data into shots', () => {
      const body = action.buildRequestBody(mockContext())
      const shots = body.shots as Array<{ id: string; videoUrl: string; audioUrl: string }>

      expect(shots).toHaveLength(1)
      expect(shots[0]!.videoUrl).toBe('https://vid1.mp4')
      expect(shots[0]!.audioUrl).toBe('https://tts1.mp3')
    })

    it('uses selectedBgmIndex to pick bgmUrl', () => {
      const body = action.buildRequestBody(mockContext({ selectedBgmIndex: 1 }))
      expect(body.bgmUrl).toBe('https://bgm2.mp3')
    })

    it('defaults to first BGM when selectedBgmIndex is 0', () => {
      const body = action.buildRequestBody(mockContext({ selectedBgmIndex: 0 }))
      expect(body.bgmUrl).toBe('https://bgm1.mp3')
    })

    it('falls back to bgmTracks[0] when selectedBgmIndex is null', () => {
      const ctx = mockContext()
      // Remove selectedBgmIndex entirely
      delete (ctx as unknown as Record<string, unknown>).selectedBgmIndex
      const body = action.buildRequestBody(ctx)
      expect(body.bgmUrl).toBe('https://bgm1.mp3')
    })

    it('includes story metadata', () => {
      const body = action.buildRequestBody(mockContext())

      expect(body.storyTitle).toBe('숲 속 모험')
      expect(body.storyLogline).toBe('토끼의 모험 이야기')
      expect(body.characters).toEqual([
        { name: '토끼', visualDescription: 'white rabbit with blue eyes' },
      ])
    })

    it('includes anchor URLs', () => {
      const body = action.buildRequestBody(mockContext())
      expect(body.anchorUrls).toContain('https://example.com/rabbit.png')
    })

    it('handles missing video/audio gracefully', () => {
      const ctx = mockContext({
        inputContext: {
          setup: { topic: 'test', formFactor: 'longform', style: 'pixar' },
        },
      })
      const body = action.buildRequestBody(ctx)

      expect(body.shots).toEqual([])
      expect(body.bgmUrl).toBe('')
    })
  })

  describe('execute', () => {
    it('calls API and returns result', async () => {
      const finalResult = {
        success: true,
        data: {
          sessionId: 'test',
          videoUrl: 'https://final.mp4',
          thumbnailUrl: 'https://thumb.png',
          totalDuration: 60,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => finalResult,
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.onChange).toHaveBeenCalledWith({
        data: finalResult,
        generatedAt: expect.any(Date),
      })
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: '합성 실패' }),
      })

      await expect(action.execute(mockContext(), mockCallbacks())).rejects.toThrow('합성 실패')
    })
  })

  describe('regenerateItem', () => {
    it('is not defined', () => {
      expect(action.regenerateItem).toBeUndefined()
    })
  })
})
