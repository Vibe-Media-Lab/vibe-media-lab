import { describe, it, expect } from 'vitest'
import { getVideoTransport, VIDEO_TRANSPORT_MAP } from '../video-transport'
import type { VideoTransport } from '../video-transport'

// ============================================================
// getVideoTransport
// ============================================================

describe('getVideoTransport', () => {
  it('등록된 모델 → 올바른 transport 반환', () => {
    const t = getVideoTransport('kling-2.6/image-to-video')
    expect(t.apiType).toBe('kieai-standard')
    expect(t.family).toBe('kling')
    expect(t.capabilities).toContain('image-to-video')
  })

  it('미등록 모델 → throw', () => {
    expect(() => getVideoTransport('unknown-model')).toThrow('Unregistered video model')
  })

  it('24개 모델 모두 등록 확인', () => {
    expect(Object.keys(VIDEO_TRANSPORT_MAP)).toHaveLength(24)
  })
})

// ============================================================
// kieai Standard 모델 (12개)
// ============================================================

describe('kieai Standard models', () => {
  const standardModels = [
    'kling-2.6/image-to-video',
    'kling-2.6/text-to-video',
    'kling-3.0/video',
    'sora-2-image-to-video',
    'sora-2-pro-image-to-video',
    'sora-2-text-to-video',
    'sora-2-pro-text-to-video',
    'bytedance/seedance-1.5-pro',
    'hailuo/2-3-image-to-video-pro',
    'wan/2-6-image-to-video',
    'wan/2-6-text-to-video',
    'grok-imagine/image-to-video',
  ]

  it.each(standardModels)('%s → kieai-standard', (modelId) => {
    const t = getVideoTransport(modelId)
    expect(t.apiType).toBe('kieai-standard')
  })

  it('kling 계열 family 검증', () => {
    expect(getVideoTransport('kling-2.6/image-to-video').family).toBe('kling')
    expect(getVideoTransport('kling-2.6/text-to-video').family).toBe('kling')
    expect(getVideoTransport('kling-3.0/video').family).toBe('kling3')
  })

  it('sora2 family 통일', () => {
    expect(getVideoTransport('sora-2-image-to-video').family).toBe('sora2')
    expect(getVideoTransport('sora-2-pro-text-to-video').family).toBe('sora2')
  })

  it('seedance capabilities = I2V + T2V', () => {
    const t = getVideoTransport('bytedance/seedance-1.5-pro')
    expect(t.capabilities).toContain('image-to-video')
    expect(t.capabilities).toContain('text-to-video')
    expect(t.family).toBe('seedance')
  })

  it('hailuo I2V only', () => {
    const t = getVideoTransport('hailuo/2-3-image-to-video-pro')
    expect(t.capabilities).toEqual(['image-to-video'])
    expect(t.family).toBe('hailuo')
  })

  it('wan 모델 분리', () => {
    expect(getVideoTransport('wan/2-6-image-to-video').capabilities).toEqual(['image-to-video'])
    expect(getVideoTransport('wan/2-6-text-to-video').capabilities).toEqual(['text-to-video'])
  })

  it('grok I2V only', () => {
    const t = getVideoTransport('grok-imagine/image-to-video')
    expect(t.capabilities).toEqual(['image-to-video'])
    expect(t.family).toBe('grok')
  })
})

// ============================================================
// kieai Veo 모델 (2개)
// ============================================================

describe('kieai Veo models', () => {
  it('veo3 → kieai-veo, I2V + T2V', () => {
    const t = getVideoTransport('veo3')
    expect(t.apiType).toBe('kieai-veo')
    expect(t.capabilities).toContain('image-to-video')
    expect(t.capabilities).toContain('text-to-video')
  })

  it('veo3_fast → kieai-veo', () => {
    const t = getVideoTransport('veo3_fast')
    expect(t.apiType).toBe('kieai-veo')
    expect(t.family).toBe('veo')
  })
})

// ============================================================
// kieai Runway (1개)
// ============================================================

describe('kieai Runway model', () => {
  it('runway/generate → kieai-runway, I2V + T2V', () => {
    const t = getVideoTransport('runway/generate')
    expect(t.apiType).toBe('kieai-runway')
    expect(t.capabilities).toContain('image-to-video')
    expect(t.capabilities).toContain('text-to-video')
    expect(t.defaultDuration).toBe('10')
  })
})

// ============================================================
// fal.ai 모델 (8개)
// ============================================================

describe('fal.ai models', () => {
  const falModels = [
    'fal-ai/kling-video/v2.6/pro/image-to-video',
    'fal-ai/kling-video/v3/standard/image-to-video',
    'fal-ai/kling-video/v3/standard/text-to-video',
    'fal-ai/minimax/hailuo-02/standard/image-to-video',
    'fal-ai/minimax/hailuo-02/pro/image-to-video',
    'fal-ai/minimax/hailuo-02/pro/text-to-video',
    'fal-ai/veo3',
    'fal-ai/luma-dream-machine/ray-2-flash',
  ]

  it.each(falModels)('%s → fal', (modelId) => {
    const t = getVideoTransport(modelId)
    expect(t.apiType).toBe('fal')
  })

  it('luma → T2V only', () => {
    const t = getVideoTransport('fal-ai/luma-dream-machine/ray-2-flash')
    expect(t.capabilities).toEqual(['text-to-video'])
    expect(t.family).toBe('luma')
  })

  it('fal veo3 → I2V + T2V', () => {
    const t = getVideoTransport('fal-ai/veo3')
    expect(t.capabilities).toContain('image-to-video')
    expect(t.capabilities).toContain('text-to-video')
    expect(t.family).toBe('veo-fal')
  })
})

// ============================================================
// defaultDuration 일관성
// ============================================================

describe('defaultDuration', () => {
  it('모든 transport의 defaultDuration이 유효한 값', () => {
    for (const [id, t] of Object.entries(VIDEO_TRANSPORT_MAP)) {
      expect(t.defaultDuration, `${id} defaultDuration`).toBeTruthy()
      expect(Number(t.defaultDuration)).toBeGreaterThan(0)
    }
  })
})
