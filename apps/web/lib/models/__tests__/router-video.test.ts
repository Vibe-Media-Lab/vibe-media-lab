import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveProvider, routeModel, getManualFallback } from '../router'
import { MODEL_CATALOG } from '../catalog'
import { ENABLED } from '../enabled'

// ============================================================
// resolveProvider — 카탈로그 우선 룩업
// ============================================================

describe('resolveProvider — catalog-first lookup', () => {
  it('wan/2-6-image-to-video (kieai 카탈로그) → kieai', () => {
    // Blocker Fix 1: wan/* 비디오 모델은 kieai
    expect(resolveProvider('wan/2-6-image-to-video')).toBe('kieai')
  })

  it('wan/2-6-text-to-video (kieai 카탈로그) → kieai', () => {
    expect(resolveProvider('wan/2-6-text-to-video')).toBe('kieai')
  })

  it('wan/v2.6/text-to-image (fal 카탈로그) → fal', () => {
    // 이미지 모델은 fal (기존 동작 보존)
    expect(resolveProvider('wan/v2.6/text-to-image')).toBe('fal')
  })

  it('wan/v2.6/image-to-image (fal 카탈로그) → fal', () => {
    expect(resolveProvider('wan/v2.6/image-to-image')).toBe('fal')
  })

  it('fal-ai/* → fal (카탈로그 존재)', () => {
    expect(resolveProvider('fal-ai/kling-video/v2.6/pro/image-to-video')).toBe('fal')
  })

  it('kling-2.6/image-to-video → kieai (카탈로그)', () => {
    expect(resolveProvider('kling-2.6/image-to-video')).toBe('kieai')
  })

  it('veo3 → kieai (카탈로그)', () => {
    expect(resolveProvider('veo3')).toBe('kieai')
  })

  it('runway/generate → kieai (카탈로그)', () => {
    expect(resolveProvider('runway/generate')).toBe('kieai')
  })

  it('미등록 fal-ai/ prefix → fal (prefix fallback)', () => {
    expect(resolveProvider('fal-ai/unknown-new-model')).toBe('fal')
  })

  it('미등록 prefix 없음 → kieai (default)', () => {
    expect(resolveProvider('some-unknown-model')).toBe('kieai')
  })
})

// ============================================================
// Enabled 모델 검증
// ============================================================

describe('Enabled video models', () => {
  it('I2V enabled 모델 수 ≥ 14', () => {
    expect(ENABLED['image-to-video'].models.length).toBeGreaterThanOrEqual(14)
  })

  it('T2V enabled 모델 수 ≥ 10', () => {
    expect(ENABLED['text-to-video'].models.length).toBeGreaterThanOrEqual(10)
  })

  it('모든 I2V enabled 모델이 catalog에 존재', () => {
    const catalogIds = MODEL_CATALOG.map(m => m.id)
    for (const id of ENABLED['image-to-video'].models) {
      expect(catalogIds, `I2V model ${id} not in catalog`).toContain(id)
    }
  })

  it('모든 T2V enabled 모델이 catalog에 존재', () => {
    const catalogIds = MODEL_CATALOG.map(m => m.id)
    for (const id of ENABLED['text-to-video'].models) {
      expect(catalogIds, `T2V model ${id} not in catalog`).toContain(id)
    }
  })

  it('I2V fallback 모델이 catalog에 존재', () => {
    const catalogIds = MODEL_CATALOG.map(m => m.id)
    for (const [, fbId] of Object.entries(ENABLED['image-to-video'].fallbacks)) {
      expect(catalogIds, `I2V fallback ${fbId} not in catalog`).toContain(fbId)
    }
  })

  it('T2V fallback 모델이 catalog에 존재', () => {
    const catalogIds = MODEL_CATALOG.map(m => m.id)
    for (const [, fbId] of Object.entries(ENABLED['text-to-video'].fallbacks)) {
      expect(catalogIds, `T2V fallback ${fbId} not in catalog`).toContain(fbId)
    }
  })

  it('I2V featured ⊆ models', () => {
    const models = ENABLED['image-to-video'].models
    for (const id of ENABLED['image-to-video'].featured) {
      expect(models, `Featured ${id} not in models`).toContain(id)
    }
  })

  it('T2V featured ⊆ models', () => {
    const models = ENABLED['text-to-video'].models
    for (const id of ENABLED['text-to-video'].featured) {
      expect(models, `Featured ${id} not in models`).toContain(id)
    }
  })

  it('I2V default ∈ models', () => {
    const models = ENABLED['image-to-video'].models
    expect(models).toContain(ENABLED['image-to-video'].defaultId)
  })

  it('T2V default ∈ models', () => {
    const models = ENABLED['text-to-video'].models
    expect(models).toContain(ENABLED['text-to-video'].defaultId)
  })
})

// ============================================================
// routeModel — I2V fallback chain
// ============================================================

describe('routeModel — video', () => {
  it('kling-2.6/image-to-video → 정상 라우팅', () => {
    const route = routeModel('kling-2.6/image-to-video', 'image-to-video')
    expect(route).not.toBeNull()
    expect(route!.modelId).toBe('kling-2.6/image-to-video')
    expect(route!.provider).toBe('kieai')
  })

  it('fal-ai/veo3 → fal provider 확인 (resolveProvider)', () => {
    // routeModel은 provider 가용성에 따라 fallback하므로 resolveProvider로 검증
    expect(resolveProvider('fal-ai/veo3')).toBe('fal')
  })

  it('I2V fallback chain 동작', () => {
    // kling-2.6 → fal-ai/kling-video/v2.6/pro/image-to-video (enabled fallback)
    const fallback = getManualFallback('kling-2.6/image-to-video', 'image-to-video')
    expect(fallback).toBe('fal-ai/kling-video/v2.6/pro/image-to-video')
  })

  it('T2V fallback chain 동작', () => {
    const fallback = getManualFallback('kling-2.6/text-to-video', 'text-to-video')
    expect(fallback).toBe('fal-ai/kling-video/v3/standard/text-to-video')
  })

  it('veo3 I2V fallback → fal-ai/veo3', () => {
    const fallback = getManualFallback('veo3', 'image-to-video')
    expect(fallback).toBe('fal-ai/veo3')
  })
})

// ============================================================
// Kids Animation 격리
// ============================================================

describe('Kids Animation video model isolation', () => {
  it('Kids videos policy는 6개 모델 허용', async () => {
    const { getStepPolicy } = await import('../workflow-policies')
    const policy = getStepPolicy('kids-animation', 'videos', 'image-to-video')
    expect(policy).not.toBeNull()
    expect(policy!.allowedModels).toContain('kling/v2-5-turbo-image-to-video-pro')
    expect(policy!.allowedModels).toContain('kling-2.6/image-to-video')
    expect(policy!.allowedModels).toHaveLength(6)
  })

  it('Kids buildRouteOverrides 반환', async () => {
    const { buildRouteOverrides } = await import('../helpers')
    const overrides = buildRouteOverrides('kids-animation', 'videos', 'image-to-video')
    expect(overrides).toBeDefined()
    expect(overrides!.defaultId).toBe('kling-2.6/image-to-video')
  })
})
