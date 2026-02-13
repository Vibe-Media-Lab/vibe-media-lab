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

const SCRIPT_SHOTS = [
  { id: 'shot-1', shotNumber: 1, duration: 10, narration: 'Once upon a time', visualPrompt: 'p' },
  { id: 'shot-2', shotNumber: 2, duration: 10, narration: 'The end', visualPrompt: 'p2' },
]

function mockContext(overrides?: Partial<StepActionContext>): StepActionContext {
  return {
    inputContext: {
      setup: { topic: '숲 속 동물 친구들', formFactor: 'longform', style: 'pixar' },
      story: {
        data: {
          success: true,
          data: {
            sessionId: 'story-session',
            story: { title: '숲 속 모험', bgmDirection: 'happy and adventurous' },
          },
        },
        generatedAt: new Date(),
      },
      script: {
        data: {
          success: true,
          data: {
            sessionId: 'script-session',
            script: { shots: SCRIPT_SHOTS, bgmPrompt: 'cheerful orchestra' },
            anchorPrompts: [],
          },
        },
        generatedAt: new Date(),
      },
      shots: {
        data: {
          success: true,
          data: { sessionId: 'shots-session', shots: SCRIPT_SHOTS },
        },
        generatedAt: new Date(),
      },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'audio',
    value: null,
    config: { previewType: 'audio-player', generateAction: 'kids/audio' },
    ...overrides,
  }
}

describe('audioAction', () => {
  const action = getAction('kids/audio')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey and endpoint', () => {
      expect(action.actionKey).toBe('kids/audio')
      expect(action.endpoint).toBe('/api/kids-animation/audio')
    })

    it('has a request schema', () => {
      expect(action.requestSchema).not.toBeNull()
    })
  })

  describe('buildRequestBody', () => {
    it('includes shots and bgm data', () => {
      const body = action.buildRequestBody(mockContext())

      expect(body.shots).toEqual(SCRIPT_SHOTS)
      expect(body.bgmPrompt).toBe('cheerful orchestra')
      expect(body.bgmDirection).toBe('happy and adventurous')
    })

    it('includes TTS and BGM models when selected', () => {
      const body = action.buildRequestBody(mockContext({
        selectedModel: 'elevenlabs-turbo',
        selectedSecondaryModel: 'suno-v4',
      }))

      expect(body.ttsModel).toBe('elevenlabs-turbo')
      expect(body.bgmModel).toBe('suno-v4')
    })

    describe('regenerate mode', () => {
      it('marks selected TTS items for regeneration', () => {
        const ctx = mockContext({
          regenerateMode: true,
          selectedForRegenerate: new Set(['shot-1']),
          value: {
            data: {
              success: true,
              data: {
                tts: [
                  { id: 'shot-1', shotNumber: 1, audioUrl: 'https://old-tts1.mp3' },
                  { id: 'shot-2', shotNumber: 2, audioUrl: 'https://old-tts2.mp3' },
                ],
                bgmTracks: [{ url: 'https://bgm.mp3' }],
              },
            },
            generatedAt: new Date(),
          },
        })

        const body = action.buildRequestBody(ctx)

        const existingTts = body.existingTts as Array<{ id: string; audioUrl: string }>
        expect(existingTts).toBeDefined()
        // shot-1 should have empty audioUrl (marked for regen)
        expect(existingTts.find((t) => t.id === 'shot-1')?.audioUrl).toBe('')
        // shot-2 should be preserved
        expect(existingTts.find((t) => t.id === 'shot-2')?.audioUrl).toBe('https://old-tts2.mp3')
      })

      it('regenerates BGM when selected', () => {
        const ctx = mockContext({
          regenerateMode: true,
          selectedForRegenerate: new Set(['bgm']),
          value: {
            data: {
              success: true,
              data: {
                tts: [{ id: 'shot-1', shotNumber: 1, audioUrl: 'https://tts1.mp3' }],
                bgmTracks: [{ url: 'https://old-bgm.mp3' }],
              },
            },
            generatedAt: new Date(),
          },
        })

        const body = action.buildRequestBody(ctx)

        // BGM regeneration means existing BGM is NOT passed
        expect(body.existingBgm).toBeUndefined()
      })

      it('handles empty selection in regenerate mode', () => {
        const ctx = mockContext({
          regenerateMode: true,
          selectedForRegenerate: new Set<string>(),
        })

        // Should fall through to normal mode
        const body = action.buildRequestBody(ctx)
        expect(body.shots).toBeDefined()
      })
    })

    it('includes existingTts when there are failed TTS entries', () => {
      const ctx = mockContext({
        value: {
          data: {
            success: true,
            data: {
              tts: [
                { id: 'shot-1', shotNumber: 1, audioUrl: 'https://tts1.mp3' },
                { id: 'shot-2', shotNumber: 2, audioUrl: '' }, // failed
              ],
              bgmTracks: [{ url: 'https://bgm.mp3' }],
            },
          },
          generatedAt: new Date(),
        },
      })

      const body = action.buildRequestBody(ctx)
      expect(body.existingTts).toBeDefined()
      expect(body.existingBgm).toBeDefined()
    })
  })

  describe('execute', () => {
    it('calls API and returns result', async () => {
      const audioResult = {
        success: true,
        data: {
          tts: [
            { id: 'shot-1', shotNumber: 1, audioUrl: 'https://tts1.mp3' },
          ],
          bgmTracks: [{ url: 'https://bgm.mp3' }],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => audioResult,
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.onChange).toHaveBeenCalledWith({
        data: audioResult,
        generatedAt: expect.any(Date),
      })
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'TTS 생성 실패' }),
      })

      await expect(action.execute(mockContext(), mockCallbacks())).rejects.toThrow('TTS 생성 실패')
    })
  })

  describe('regenerateItem', () => {
    it('is not defined (audio uses regenerateMode instead)', () => {
      expect(action.regenerateItem).toBeUndefined()
    })
  })
})
