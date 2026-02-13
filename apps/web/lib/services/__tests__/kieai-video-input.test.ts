import { describe, it, expect } from 'vitest'
import { buildKieaiVideoInput } from '../kieai-client'

describe('buildKieaiVideoInput', () => {
  const baseParams = {
    modelId: '',
    prompt: 'test prompt',
  }

  describe('kling family (Kling 2.6)', () => {
    it('aspectRatio 전달 시 aspect_ratio 포함', () => {
      const result = buildKieaiVideoInput('kling', {
        ...baseParams,
        aspectRatio: '9:16',
      })
      expect(result.aspect_ratio).toBe('9:16')
    })

    it('aspectRatio 미전달 시 기본값 16:9', () => {
      const result = buildKieaiVideoInput('kling', baseParams)
      expect(result.aspect_ratio).toBe('16:9')
    })
  })

  describe('kling3 family (Kling 3.0)', () => {
    it('aspectRatio 전달 시 aspect_ratio 포함', () => {
      const result = buildKieaiVideoInput('kling3', {
        ...baseParams,
        aspectRatio: '9:16',
      })
      expect(result.aspect_ratio).toBe('9:16')
    })

    it('aspectRatio 미전달 시 기본값 16:9', () => {
      const result = buildKieaiVideoInput('kling3', baseParams)
      expect(result.aspect_ratio).toBe('16:9')
    })

    it('imageUrl 전달 시 image_urls 배열로 변환', () => {
      const result = buildKieaiVideoInput('kling3', {
        ...baseParams,
        imageUrl: 'https://example.com/img.png',
      })
      expect(result.image_urls).toEqual(['https://example.com/img.png'])
    })

    it('sound 기본값 false', () => {
      const result = buildKieaiVideoInput('kling3', baseParams)
      expect(result.sound).toBe(false)
    })
  })

  describe('kling-turbo family (Kling 2.5 Turbo)', () => {
    it('aspect_ratio 미포함', () => {
      const result = buildKieaiVideoInput('kling-turbo', {
        ...baseParams,
        aspectRatio: '9:16',
      })
      expect(result).not.toHaveProperty('aspect_ratio')
    })
  })

  describe('sora2 family', () => {
    it('16:9 → landscape 변환', () => {
      const result = buildKieaiVideoInput('sora2', {
        ...baseParams,
        aspectRatio: '16:9',
      })
      expect(result.aspect_ratio).toBe('landscape')
    })

    it('9:16 → portrait 변환', () => {
      const result = buildKieaiVideoInput('sora2', {
        ...baseParams,
        aspectRatio: '9:16',
      })
      expect(result.aspect_ratio).toBe('portrait')
    })

    it('aspectRatio 미전달 시 기본값 landscape', () => {
      const result = buildKieaiVideoInput('sora2', baseParams)
      expect(result.aspect_ratio).toBe('landscape')
    })
  })
})
