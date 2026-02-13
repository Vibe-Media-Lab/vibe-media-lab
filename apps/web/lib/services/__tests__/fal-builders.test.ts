import { describe, it, expect } from 'vitest'
import {
  getFalTransport,
  FAL_TRANSPORT_MAP,
  buildImageGenerateInput,
  buildImageEditInput,
  mapToFalImageSize,
  FalError,
} from '../fal-client'

// ============================================================
// getFalTransport
// ============================================================

describe('getFalTransport', () => {
  it('등록된 모델 → 올바른 transport 반환', () => {
    const t = getFalTransport('fal-ai/flux-2-pro')
    expect(t.sizeParam).toBe('image_size')
    expect(t.imageUrlParam).toBe('image_urls')
    expect(t.supportsOutputFormat).toBe(true)
  })

  it('미등록 모델 → FalError throw', () => {
    expect(() => getFalTransport('unknown-model')).toThrow(FalError)
    expect(() => getFalTransport('unknown-model')).toThrow('Unregistered fal model')
  })

  it('16개 모델 모두 등록 확인', () => {
    const expectedModels = [
      'fal-ai/flux-2-pro', 'fal-ai/flux-2-pro/edit',
      'fal-ai/flux-2-flex', 'fal-ai/flux-2-flex/edit',
      'fal-ai/flux-2-max', 'fal-ai/flux-2-max/edit',
      'fal-ai/bytedance/seedream/v4.5/text-to-image', 'fal-ai/bytedance/seedream/v4.5/edit',
      'fal-ai/bytedance/seedream/v4/text-to-image', 'fal-ai/bytedance/seedream/v4/edit',
      'fal-ai/gpt-image-1.5', 'fal-ai/gpt-image-1.5/edit',
      'fal-ai/reve/text-to-image', 'fal-ai/reve/edit',
      'wan/v2.6/text-to-image', 'wan/v2.6/image-to-image',
    ]
    expect(Object.keys(FAL_TRANSPORT_MAP)).toHaveLength(16)
    for (const id of expectedModels) {
      expect(FAL_TRANSPORT_MAP[id]).toBeDefined()
    }
  })
})

// ============================================================
// buildImageGenerateInput
// ============================================================

describe('buildImageGenerateInput', () => {
  it('Flux 2 Pro — image_size + output_format, num_images 없음', () => {
    const input = buildImageGenerateInput('fal-ai/flux-2-pro', {
      prompt: 'a cat', aspectRatio: '4:3', resolution: '1K',
    })
    expect(input.image_size).toBe('landscape_4_3')
    expect(input.output_format).toBe('png')
    expect(input).not.toHaveProperty('num_images')
    expect(input).not.toHaveProperty('aspect_ratio')
  })

  it('Reve T2I — aspect_ratio (image_size 없음)', () => {
    const input = buildImageGenerateInput('fal-ai/reve/text-to-image', {
      prompt: 'a dog', aspectRatio: '4:3',
    })
    expect(input.aspect_ratio).toBe('4:3')
    expect(input).not.toHaveProperty('image_size')
    expect(input.output_format).toBe('png')
  })

  it('Seedream 4.5 — image_size, output_format 없음', () => {
    const input = buildImageGenerateInput('fal-ai/bytedance/seedream/v4.5/text-to-image', {
      prompt: 'a house', aspectRatio: '16:9', resolution: '2K',
    })
    expect(input.image_size).toBeDefined()
    expect(input).not.toHaveProperty('output_format')
  })

  it('Wan 2.6 — image_size, output_format 없음', () => {
    const input = buildImageGenerateInput('wan/v2.6/text-to-image', {
      prompt: 'a tree', aspectRatio: '1:1', resolution: '1K',
    })
    expect(input.image_size).toBe('square_hd')
    expect(input).not.toHaveProperty('output_format')
  })

  it('GPT Image 1.5 — 고정 사이즈 매핑', () => {
    const input = buildImageGenerateInput('fal-ai/gpt-image-1.5', {
      prompt: 'a bird', aspectRatio: '16:9', resolution: '1K',
    })
    expect(input.image_size).toEqual({ width: 1536, height: 1024 })
    expect(input.output_format).toBe('png')
  })

  it('기본값 — aspectRatio=16:9, resolution=1K', () => {
    const input = buildImageGenerateInput('fal-ai/flux-2-pro', { prompt: 'test' })
    expect(input.image_size).toBe('landscape_16_9')
  })
})

// ============================================================
// buildImageEditInput
// ============================================================

describe('buildImageEditInput', () => {
  const twoUrls = ['https://example.com/a.png', 'https://example.com/b.png']

  it('Flux 2 Pro Edit — image_urls (복수) + image_size + output_format', () => {
    const input = buildImageEditInput('fal-ai/flux-2-pro/edit', {
      prompt: 'make it blue', imageUrls: twoUrls, aspectRatio: '16:9', resolution: '1K',
    })
    expect(input.image_urls).toEqual(twoUrls)
    expect(input).not.toHaveProperty('image_url')
    expect(input.image_size).toBe('landscape_16_9')
    expect(input.output_format).toBe('png')
  })

  it('Reve Edit — image_url (단수), sizeParam null, output_format', () => {
    const input = buildImageEditInput('fal-ai/reve/edit', {
      prompt: 'make it red', imageUrls: twoUrls, aspectRatio: '4:3',
    })
    // maxRefImages=1 → 첫 번째 URL만
    expect(input.image_url).toBe(twoUrls[0])
    expect(input).not.toHaveProperty('image_urls')
    expect(input).not.toHaveProperty('image_size')
    expect(input).not.toHaveProperty('aspect_ratio')
    expect(input.output_format).toBe('png')
  })

  it('Seedream 4.5 Edit — image_urls + image_size, output_format 없음', () => {
    const input = buildImageEditInput('fal-ai/bytedance/seedream/v4.5/edit', {
      prompt: 'change style', imageUrls: twoUrls, aspectRatio: '1:1', resolution: '2K',
    })
    expect(input.image_urls).toEqual(twoUrls)
    expect(input.image_size).toBeDefined()
    expect(input).not.toHaveProperty('output_format')
  })

  it('nano-banana-pro/edit — 레거시 포맷 (aspect_ratio + resolution)', () => {
    const input = buildImageEditInput('fal-ai/nano-banana-pro/edit', {
      prompt: 'add hat', imageUrls: twoUrls, aspectRatio: '16:9', resolution: '1K',
    })
    expect(input.image_urls).toEqual(twoUrls)
    expect(input.aspect_ratio).toBe('16:9')
    expect(input.resolution).toBe('1K')
    expect(input.output_format).toBe('png')
    expect(input).not.toHaveProperty('image_size')
  })

  it('Wan 2.6 I2I — maxRefImages=1 적용 확인', () => {
    const input = buildImageEditInput('wan/v2.6/image-to-image', {
      prompt: 'enhance', imageUrls: twoUrls, aspectRatio: '1:1', resolution: '1K',
    })
    expect(input.image_urls).toEqual([twoUrls[0]])
    expect(input).not.toHaveProperty('output_format')
  })

  it('GPT Image 1.5 Edit — maxRefImages=1 적용 확인', () => {
    const input = buildImageEditInput('fal-ai/gpt-image-1.5/edit', {
      prompt: 'edit', imageUrls: twoUrls, aspectRatio: '1:1',
    })
    expect(input.image_urls).toEqual([twoUrls[0]])
    expect(input.output_format).toBe('png')
  })

  it('미등록 모델 → FalError throw', () => {
    expect(() => buildImageEditInput('unknown/model', {
      prompt: 'test', imageUrls: twoUrls,
    })).toThrow(FalError)
  })

  it('빈 imageUrls → FalError throw', () => {
    expect(() => buildImageEditInput('fal-ai/flux-2-pro/edit', {
      prompt: 'test', imageUrls: [],
    })).toThrow('imageUrls cannot be empty')
  })
})

// ============================================================
// mapToFalImageSize
// ============================================================

describe('mapToFalImageSize', () => {
  it('1K + 프리셋 비율 → 프리셋 문자열', () => {
    expect(mapToFalImageSize('fal-ai/flux-2-pro', '16:9', '1K')).toBe('landscape_16_9')
    expect(mapToFalImageSize('fal-ai/flux-2-pro', '1:1', '1K')).toBe('square_hd')
    expect(mapToFalImageSize('fal-ai/flux-2-pro', '9:16', '1K')).toBe('portrait_16_9')
  })

  it('2K + 프리셋 비율 → 커스텀 {width, height}', () => {
    const size = mapToFalImageSize('fal-ai/flux-2-pro', '16:9', '2K')
    expect(size).toEqual({ width: expect.any(Number), height: expect.any(Number) })
    const s = size as { width: number; height: number }
    expect(s.width).toBeGreaterThan(1024)
    expect(s.width % 64).toBe(0)
    expect(s.height % 64).toBe(0)
  })

  it('GPT Image 1.5 → 고정 3사이즈', () => {
    expect(mapToFalImageSize('fal-ai/gpt-image-1.5', '1:1', '1K')).toEqual({ width: 1024, height: 1024 })
    expect(mapToFalImageSize('fal-ai/gpt-image-1.5', '16:9', '1K')).toEqual({ width: 1536, height: 1024 })
    expect(mapToFalImageSize('fal-ai/gpt-image-1.5', '9:16', '1K')).toEqual({ width: 1024, height: 1536 })
  })

  it('1K + 비프리셋 비율 → 커스텀 {width, height}', () => {
    const size = mapToFalImageSize('fal-ai/flux-2-pro', '21:9', '1K')
    expect(size).toEqual({ width: expect.any(Number), height: expect.any(Number) })
  })
})
