import { describe, it, expect } from 'vitest'
import { getAction } from '../registry'
import type { StepActionContext } from '../types'

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
                'A brave warrior with warm golden armor',
                'A brave warrior with cool blue steel armor',
                'A brave warrior with minimalist white armor',
              ],
              backstory: '전사 배경',
              archetype: 'bright-3d-boy',
            },
            styleHint: {
              visualStyle: 'bright-3d',
              promptKeywords: ['Pixar 3D animation style', 'Disney 3D rendering'],
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
    stepId: 'main-visual',
    value: null,
    config: { previewType: 'image-select', generateAction: 'character/main-visual', batchSize: 4 },
    ...overrides,
  }
}

describe('styleHint 전파 통합 테스트', () => {
  const mainVisualAction = getAction('character/main-visual')!
  const characterSheetAction = getAction('character/character-sheet')!

  describe('quickstart에 styleHint 있을 때', () => {
    it('main-visual body에 styleHint 포함', () => {
      const ctx = mockContext()
      const body = mainVisualAction.buildRequestBody(ctx)

      expect(body.styleHint).toEqual({
        visualStyle: 'bright-3d',
        promptKeywords: ['Pixar 3D animation style', 'Disney 3D rendering'],
      })
    })

    it('character-sheet body에 styleHint 포함', () => {
      const ctx = mockContext({ stepId: 'character-sheet' })
      const body = characterSheetAction.buildRequestBody(ctx)

      expect(body.styleHint).toEqual({
        visualStyle: 'bright-3d',
        promptKeywords: ['Pixar 3D animation style', 'Disney 3D rendering'],
      })
    })
  })

  describe('quickstart에 styleHint 없을 때 (freetext)', () => {
    function ctxWithoutStyleHint(overrides?: Partial<StepActionContext>): StepActionContext {
      return mockContext({
        inputContext: {
          quickstart: {
            data: {
              success: true,
              data: {
                sessionId: 'test-session',
                profile: {
                  name: '자유 캐릭터',
                  personality: '신비로운',
                  visualDescription: 'A mysterious figure',
                  backstory: '배경',
                  archetype: 'freetext',
                },
                // styleHint 없음
              },
            },
            generatedAt: new Date(),
          },
          'main-visual': mockContext().inputContext['main-visual'] as Record<string, unknown>,
        },
        ...overrides,
      })
    }

    it('main-visual body에 styleHint 없음 (undefined)', () => {
      const body = mainVisualAction.buildRequestBody(ctxWithoutStyleHint())
      expect(body.styleHint).toBeUndefined()
    })

    it('character-sheet body에 styleHint 없음', () => {
      const body = characterSheetAction.buildRequestBody(ctxWithoutStyleHint({ stepId: 'character-sheet' }))
      expect(body.styleHint).toBeUndefined()
    })
  })
})
