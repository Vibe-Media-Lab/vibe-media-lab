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

const VALID_STORY = {
  title: '숲 속 모험',
  lesson: '우정의 소중함',
  synopsis: '토끼가 숲에서 친구를 찾는 이야기',
  plot: {
    opening: '토끼가 숲에 살고 있었다',
    incitingIncident: '외로움을 느낀 토끼',
    risingAction: '친구를 찾아 모험을 떠남',
    climax: '위험한 강을 건너다',
    fallingAction: '다람쥐의 도움',
    resolution: '함께 행복하게 살았다',
  },
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
            story: VALID_STORY,
          },
        },
        generatedAt: new Date(),
      },
    },
    sessionId: 'test-session',
    projectId: null,
    stepId: 'script',
    value: null,
    config: { previewType: 'shot-list', generateAction: 'kids/script' },
    ...overrides,
  }
}

describe('scriptAction', () => {
  const action = getAction('kids/script')!
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('metadata', () => {
    it('has correct actionKey', () => {
      expect(action.actionKey).toBe('kids/script')
    })

    it('has a request schema', () => {
      expect(action.requestSchema).not.toBeNull()
    })
  })

  describe('buildRequestBody', () => {
    it('includes story from inputContext', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      expect(body.story).toBeDefined()
      expect(body.story).toEqual(VALID_STORY)
    })

    it('includes base request fields', () => {
      const ctx = mockContext()
      const body = action.buildRequestBody(ctx)

      expect(body.sessionId).toBe('test-session')
      expect(body.formFactor).toBe('longform')
      expect(body.style).toBe('pixar')
    })

    it('handles missing story gracefully', () => {
      const ctx = mockContext({ inputContext: {} })
      const body = action.buildRequestBody(ctx)

      expect(body.story).toBeUndefined()
    })
  })

  describe('execute', () => {
    it('calls API and returns result', async () => {
      const scriptData = {
        success: true,
        data: {
          sessionId: 'test-session',
          script: { shots: [], bgmPrompt: 'happy music' },
          anchorPrompts: [{ id: 'a1', category: 'character', name: '토끼', prompt: 'cute rabbit' }],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => scriptData,
      })

      const callbacks = mockCallbacks()
      await action.execute(mockContext(), callbacks)

      expect(callbacks.onChange).toHaveBeenCalledWith({
        data: scriptData,
        generatedAt: expect.any(Date),
      })
      expect(callbacks.setStatus).toHaveBeenCalledWith('reviewing')
    })

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: '스토리가 필요합니다' }),
      })

      await expect(action.execute(mockContext(), mockCallbacks())).rejects.toThrow('스토리가 필요합니다')
    })
  })

  describe('regenerateItem', () => {
    it('is not defined', () => {
      expect(action.regenerateItem).toBeUndefined()
    })
  })
})
