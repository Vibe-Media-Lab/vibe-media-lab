import { describe, it, expect } from 'vitest'
import { getAction, assertAllRegistered } from '../registry'

describe('StepAction Registry', () => {
  describe('기존 7개 필수 액션 등록', () => {
    const requiredActions = [
      'kids/story',
      'kids/script',
      'kids/expand',
      'kids/shots',
      'kids/videos',
      'kids/audio',
      'kids/final',
    ]

    for (const key of requiredActions) {
      it(`${key} is registered`, () => {
        const action = getAction(key)
        expect(action).toBeDefined()
        expect(action!.actionKey).toBe(key)
      })
    }
  })

  describe('anchors 액션 등록', () => {
    it('kids/anchors is registered', () => {
      const action = getAction('kids/anchors')
      expect(action).toBeDefined()
      expect(action!.actionKey).toBe('kids/anchors')
      expect(action!.endpoint).toBe('/api/kids-animation/anchors')
    })
  })

  describe('character 액션 등록', () => {
    const characterActions = [
      'character/quickstart',
      'character/main-visual',
      'character/character-sheet',
    ]

    for (const key of characterActions) {
      it(`${key} is registered`, () => {
        const action = getAction(key)
        expect(action).toBeDefined()
        expect(action!.actionKey).toBe(key)
      })
    }
  })

  describe('character 액션 메타데이터', () => {
    it('quickstart has correct endpoint', () => {
      expect(getAction('character/quickstart')!.endpoint).toBe('/api/character/quickstart')
    })

    it('main-visual has correct endpoint', () => {
      expect(getAction('character/main-visual')!.endpoint).toBe('/api/character/main-visual')
    })

    it('character-sheet has correct endpoint', () => {
      expect(getAction('character/character-sheet')!.endpoint).toBe('/api/character/character-sheet')
    })
  })

  describe('미등록 액션', () => {
    it('returns undefined for nonexistent key', () => {
      expect(getAction('nonexistent')).toBeUndefined()
    })

    it('returns undefined for empty string', () => {
      expect(getAction('')).toBeUndefined()
    })
  })

  describe('assertAllRegistered', () => {
    it('does not throw when all required actions are registered', () => {
      expect(() => assertAllRegistered()).not.toThrow()
    })
  })

  describe('각 액션의 메타데이터', () => {
    it('story has correct endpoint', () => {
      expect(getAction('kids/story')!.endpoint).toBe('/api/kids-animation/story')
    })

    it('script has correct endpoint', () => {
      expect(getAction('kids/script')!.endpoint).toBe('/api/kids-animation/script')
    })

    it('expand has correct endpoint', () => {
      expect(getAction('kids/expand')!.endpoint).toBe('/api/kids-animation/expand')
    })

    it('shots has correct endpoint', () => {
      expect(getAction('kids/shots')!.endpoint).toBe('/api/kids-animation/shots')
    })

    it('videos has correct endpoint', () => {
      expect(getAction('kids/videos')!.endpoint).toBe('/api/kids-animation/videos')
    })

    it('audio has correct endpoint', () => {
      expect(getAction('kids/audio')!.endpoint).toBe('/api/kids-animation/audio')
    })

    it('final has correct endpoint', () => {
      expect(getAction('kids/final')!.endpoint).toBe('/api/kids-animation/final')
    })
  })
})
