import { describe, it, expect } from 'vitest'
import { buildVideoInput, buildTextToVideoInput } from '../fal-client'

// ============================================================
// buildVideoInput (Image-to-Video)
// ============================================================

describe('buildVideoInput', () => {
  const baseParams = {
    imageUrl: 'https://example.com/img.png',
    prompt: 'test prompt',
  }

  describe('Veo3 (fal)', () => {
    it('resolution 전달 시 input에 포함', () => {
      const input = buildVideoInput('fal-ai/veo3', {
        ...baseParams,
        resolution: '1080p',
      })
      expect(input.resolution).toBe('1080p')
      expect(input.prompt).toBe('test prompt')
      expect(input.image_url).toBe(baseParams.imageUrl)
    })

    it('resolution 미전달 시 input에 미포함', () => {
      const input = buildVideoInput('fal-ai/veo3', baseParams)
      expect(input).not.toHaveProperty('resolution')
    })

    it('sound + aspectRatio + resolution 모두 전달', () => {
      const input = buildVideoInput('fal-ai/veo3', {
        ...baseParams,
        sound: true,
        aspectRatio: '9:16',
        resolution: '720p',
      })
      expect(input.generate_audio).toBe(true)
      expect(input.aspect_ratio).toBe('9:16')
      expect(input.resolution).toBe('720p')
    })
  })

  describe('Kling v3 I2V (fal) — aspect_ratio', () => {
    it('aspectRatio 전달 시 input.aspect_ratio 포함', () => {
      const input = buildVideoInput('fal-ai/kling-video/v3/standard/image-to-video', {
        ...baseParams,
        aspectRatio: '9:16',
      })
      expect(input.aspect_ratio).toBe('9:16')
    })

    it('aspectRatio 미전달 시 input.aspect_ratio 미포함', () => {
      const input = buildVideoInput('fal-ai/kling-video/v3/standard/image-to-video', baseParams)
      expect(input).not.toHaveProperty('aspect_ratio')
    })
  })

  describe('Kling 2.6 Pro (fal) — resolution 무관', () => {
    it('resolution 파라미터 무시 (기본 모델)', () => {
      const input = buildVideoInput('fal-ai/kling-video/v2.6/pro/image-to-video', {
        ...baseParams,
        resolution: '1080p',
      })
      expect(input).not.toHaveProperty('resolution')
      expect(input.start_image_url).toBe(baseParams.imageUrl)
    })
  })

  describe('Hailuo I2V — resolution 무관', () => {
    it('resolution 파라미터 무시', () => {
      const input = buildVideoInput('fal-ai/minimax/hailuo-02/standard/image-to-video', {
        ...baseParams,
        resolution: '768p',
      })
      expect(input).not.toHaveProperty('resolution')
      expect(input.image_url).toBe(baseParams.imageUrl)
    })
  })
})

// ============================================================
// buildTextToVideoInput (Text-to-Video)
// ============================================================

describe('buildTextToVideoInput', () => {
  const baseParams = { prompt: 'a cat walking' }

  describe('Veo3 T2V (fal)', () => {
    it('resolution 전달 시 포함', () => {
      const input = buildTextToVideoInput('fal-ai/veo3', {
        ...baseParams,
        resolution: '1080p',
      })
      expect(input.resolution).toBe('1080p')
      expect(input.generate_audio).toBe(false) // default
    })

    it('resolution 미전달 시 미포함', () => {
      const input = buildTextToVideoInput('fal-ai/veo3', baseParams)
      expect(input).not.toHaveProperty('resolution')
    })
  })

  describe('Luma T2V — 기존 동작 유지', () => {
    it('resolution 기본값 720p', () => {
      const input = buildTextToVideoInput('fal-ai/luma-dream-machine/ray-2-flash', baseParams)
      expect(input.resolution).toBe('720p')
    })

    it('resolution 명시 전달', () => {
      const input = buildTextToVideoInput('fal-ai/luma-dream-machine/ray-2-flash', {
        ...baseParams,
        resolution: '1080p',
      })
      expect(input.resolution).toBe('1080p')
    })
  })

  describe('Hailuo T2V — 기존 동작 유지', () => {
    it('resolution 기본값 1080p', () => {
      const input = buildTextToVideoInput('fal-ai/minimax/hailuo-02/pro/text-to-video', baseParams)
      expect(input.resolution).toBe('1080p')
    })
  })

  describe('Kling v3 T2V — aspect_ratio', () => {
    it('aspectRatio 전달 시 포함', () => {
      const input = buildTextToVideoInput('fal-ai/kling-video/v3/standard/text-to-video', {
        ...baseParams,
        aspectRatio: '1:1',
      })
      expect(input.aspect_ratio).toBe('1:1')
    })

    it('aspectRatio 미전달 시 미포함', () => {
      const input = buildTextToVideoInput('fal-ai/kling-video/v3/standard/text-to-video', baseParams)
      expect(input).not.toHaveProperty('aspect_ratio')
    })

    it('resolution 파라미터 없음', () => {
      const input = buildTextToVideoInput('fal-ai/kling-video/v3/standard/text-to-video', baseParams)
      expect(input).not.toHaveProperty('resolution')
    })
  })
})
