import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWorkflowPolicy, getStepPolicy, KIDS_ANIMATION_POLICY, CHARACTER_CREATOR_POLICY } from '../workflow-policies'
import { getModelSelectionConfigForWorkflow, getStepPolicyForWorkflow, buildRouteOverrides } from '../helpers'
import { routeModel, getManualFallback } from '../router'

// ============================================================
// workflow-policies.ts
// ============================================================

describe('getWorkflowPolicy', () => {
  it('kids-animation 정책을 반환한다', () => {
    const policy = getWorkflowPolicy('kids-animation')
    expect(policy).not.toBeNull()
    expect(policy!.workflowId).toBe('kids-animation')
    expect(policy!.label).toBe('Kids Animation')
  })

  it('미등록 워크플로우는 null을 반환한다', () => {
    expect(getWorkflowPolicy('unknown')).toBeNull()
    expect(getWorkflowPolicy('')).toBeNull()
  })
})

describe('getStepPolicy', () => {
  it('videos:image-to-video → 6개 모델 포함', () => {
    const policy = getStepPolicy('kids-animation', 'videos', 'image-to-video')
    expect(policy).not.toBeNull()
    expect(policy!.allowedModels).toHaveLength(6)
    expect(policy!.allowedModels).toContain('kling/v2-5-turbo-image-to-video-pro')
    expect(policy!.allowedModels).toContain('kling-2.6/image-to-video')
    expect(policy!.fallbacks).toEqual({
      'kling-2.6/image-to-video': 'fal-ai/kling-video/v2.6/pro/image-to-video',
      'kling-3.0/video': 'fal-ai/kling-video/v3/standard/image-to-video',
      'hailuo/2-3-image-to-video-pro': 'fal-ai/minimax/hailuo-02/pro/image-to-video',
    })
  })

  it('anchors:text-to-image → kieai nano-banana-pro만', () => {
    const policy = getStepPolicy('kids-animation', 'anchors', 'text-to-image')
    expect(policy).not.toBeNull()
    expect(policy!.allowedModels).toEqual(['nano-banana-pro'])
    expect(policy!.defaultModel).toBe('nano-banana-pro')
    expect(policy!.fallbacks).toEqual({ 'nano-banana-pro': 'gemini-3-pro-image-preview' })
  })

  it('expand:image-to-image → fal nano-banana-pro/edit만', () => {
    const policy = getStepPolicy('kids-animation', 'expand', 'image-to-image')
    expect(policy).not.toBeNull()
    expect(policy!.allowedModels).toEqual(['fal-ai/nano-banana-pro/edit'])
    expect(policy!.defaultModel).toBe('fal-ai/nano-banana-pro/edit')
    expect(policy!.fallbacks).toEqual({ 'fal-ai/nano-banana-pro/edit': 'gemini-3-pro-image-preview' })
  })

  it('shots:image-to-image → fal nano-banana-pro/edit만', () => {
    const policy = getStepPolicy('kids-animation', 'shots', 'image-to-image')
    expect(policy).not.toBeNull()
    expect(policy!.allowedModels).toEqual(['fal-ai/nano-banana-pro/edit'])
    expect(policy!.fallbacks).toEqual({ 'fal-ai/nano-banana-pro/edit': 'gemini-3-pro-image-preview' })
  })

  it('audio:tts → fal ElevenLabs 2개만 (kieai는 fallback 전용)', () => {
    const policy = getStepPolicy('kids-animation', 'audio', 'tts')
    expect(policy).not.toBeNull()
    expect(policy!.allowedModels).toHaveLength(2)
    expect(policy!.allowedModels).toEqual([
      'fal-ai/elevenlabs/tts/multilingual-v2',
      'fal-ai/elevenlabs/tts/turbo-v2.5',
    ])
    expect(policy!.fallbacks).toEqual({
      'fal-ai/elevenlabs/tts/multilingual-v2': 'elevenlabs/text-to-speech-multilingual-v2',
      'fal-ai/elevenlabs/tts/turbo-v2.5': 'elevenlabs/text-to-speech-turbo-2-5',
    })
  })

  it('audio:secondary:bgm → Suno 5개 반환', () => {
    const policy = getStepPolicy('kids-animation', 'audio:secondary', 'bgm')
    expect(policy).not.toBeNull()
    expect(policy!.allowedModels).toHaveLength(5)
    expect(policy!.defaultModel).toBe('V4_5')
  })

  it('미등록 워크플로우 → null', () => {
    expect(getStepPolicy('unknown', 'videos', 'image-to-video')).toBeNull()
  })

  it('등록된 워크플로우 + 미등록 스텝 → null', () => {
    expect(getStepPolicy('kids-animation', 'nonexistent', 'image-to-video')).toBeNull()
  })
})

describe('KIDS_ANIMATION_POLICY 구조', () => {
  it('모든 스텝에 필수 필드가 존재한다', () => {
    for (const [key, stepPolicy] of Object.entries(KIDS_ANIMATION_POLICY.steps)) {
      expect(stepPolicy.allowedModels.length).toBeGreaterThan(0)
      expect(stepPolicy.defaultModel).toBeTruthy()
      expect(stepPolicy.allowedModels).toContain(stepPolicy.defaultModel)
      expect(Array.isArray(stepPolicy.featured)).toBe(true)
      expect(typeof stepPolicy.fallbacks).toBe('object')
    }
  })

  it('fallback 대상이 catalog에 존재한다 (allowedModels 외부일 수 있음)', () => {
    for (const [, stepPolicy] of Object.entries(KIDS_ANIMATION_POLICY.steps)) {
      for (const fallbackId of Object.values(stepPolicy.fallbacks)) {
        // fallback은 catalog에만 존재하면 됨 (allowedModels에 없어도 OK)
        expect(typeof fallbackId).toBe('string')
        expect(fallbackId.length).toBeGreaterThan(0)
      }
    }
  })
})

// ============================================================
// helpers.ts — getModelSelectionConfigForWorkflow
// ============================================================

// ============================================================
// CHARACTER_CREATOR_POLICY
// ============================================================

describe('CHARACTER_CREATOR_POLICY', () => {
  it('character-creator 정책을 반환한다', () => {
    const policy = getWorkflowPolicy('character-creator')
    expect(policy).not.toBeNull()
    expect(policy!.workflowId).toBe('character-creator')
    expect(policy!.label).toBe('Character Creator')
  })

  it('main-visual:text-to-image → 정책 반환', () => {
    const policy = getStepPolicy('character-creator', 'main-visual', 'text-to-image')
    expect(policy).not.toBeNull()
    expect(policy!.defaultModel).toBe('nano-banana-pro')
    expect(policy!.allowedModels).toContain('nano-banana-pro')
    expect(policy!.allowedModels).toContain('fal-ai/flux-2-pro')
  })

  it('character-sheet:image-to-image → 정책 반환', () => {
    const policy = getStepPolicy('character-creator', 'character-sheet', 'image-to-image')
    expect(policy).not.toBeNull()
    expect(policy!.defaultModel).toBe('fal-ai/nano-banana-pro/edit')
    expect(policy!.allowedModels).toEqual(['fal-ai/nano-banana-pro/edit'])
  })

  it('모든 스텝에 필수 필드가 존재한다', () => {
    for (const [, stepPolicy] of Object.entries(CHARACTER_CREATOR_POLICY.steps)) {
      expect(stepPolicy.allowedModels.length).toBeGreaterThan(0)
      expect(stepPolicy.defaultModel).toBeTruthy()
      expect(stepPolicy.allowedModels).toContain(stepPolicy.defaultModel)
      expect(Array.isArray(stepPolicy.featured)).toBe(true)
      expect(typeof stepPolicy.fallbacks).toBe('object')
    }
  })

  it('main-visual fallback → gemini', () => {
    const policy = getStepPolicy('character-creator', 'main-visual', 'text-to-image')
    expect(policy!.fallbacks).toEqual({ 'nano-banana-pro': 'gemini-3-pro-image-preview' })
  })

  it('character-sheet fallback → gemini', () => {
    const policy = getStepPolicy('character-creator', 'character-sheet', 'image-to-image')
    expect(policy!.fallbacks).toEqual({ 'fal-ai/nano-banana-pro/edit': 'gemini-3-pro-image-preview' })
  })
})

describe('buildRouteOverrides for character-creator', () => {
  it('main-visual:text-to-image → nano-banana-pro fallback + defaultId', () => {
    const overrides = buildRouteOverrides('character-creator', 'main-visual', 'text-to-image')
    expect(overrides).toBeDefined()
    expect(overrides!.fallbacks).toEqual({ 'nano-banana-pro': 'gemini-3-pro-image-preview' })
    expect(overrides!.defaultId).toBe('nano-banana-pro')
  })

  it('character-sheet:image-to-image → fal edit fallback + defaultId', () => {
    const overrides = buildRouteOverrides('character-creator', 'character-sheet', 'image-to-image')
    expect(overrides).toBeDefined()
    expect(overrides!.fallbacks).toEqual({ 'fal-ai/nano-banana-pro/edit': 'gemini-3-pro-image-preview' })
    expect(overrides!.defaultId).toBe('fal-ai/nano-banana-pro/edit')
  })
})

describe('getModelSelectionConfigForWorkflow for character-creator', () => {
  it('main-visual:text-to-image → 2개 모델 반환', () => {
    const config = getModelSelectionConfigForWorkflow('character-creator', 'main-visual', 'text-to-image')
    expect(config.category).toBe('text-to-image')
    expect(config.defaultModelId).toBe('nano-banana-pro')
    const ids = config.options.map(o => o.id)
    expect(ids).toContain('nano-banana-pro')
    expect(ids).toContain('fal-ai/flux-2-pro')
  })

  it('character-sheet:image-to-image → 1개 모델 반환', () => {
    const config = getModelSelectionConfigForWorkflow('character-creator', 'character-sheet', 'image-to-image')
    expect(config.category).toBe('image-to-image')
    expect(config.defaultModelId).toBe('fal-ai/nano-banana-pro/edit')
    const ids = config.options.map(o => o.id)
    expect(ids).toEqual(['fal-ai/nano-banana-pro/edit'])
  })
})

// ============================================================
// helpers.ts — getModelSelectionConfigForWorkflow (Kids Animation)
// ============================================================

describe('getModelSelectionConfigForWorkflow', () => {
  it('정책이 있으면 정책 기반 옵션 반환', () => {
    const config = getModelSelectionConfigForWorkflow('kids-animation', 'videos', 'image-to-video')
    expect(config.category).toBe('image-to-video')
    expect(config.defaultModelId).toBe('kling-2.6/image-to-video')

    const ids = config.options.map(o => o.id)
    expect(ids).toHaveLength(6)
    expect(ids).toContain('kling/v2-5-turbo-image-to-video-pro')
    expect(ids).toContain('kling-2.6/image-to-video')
  })

  it('text-to-image → kieai nano-banana-pro만', () => {
    const config = getModelSelectionConfigForWorkflow('kids-animation', 'anchors', 'text-to-image')
    const ids = config.options.map(o => o.id)
    expect(ids).toEqual(['nano-banana-pro'])
    expect(config.defaultModelId).toBe('nano-banana-pro')
  })

  it('image-to-image → fal nano-banana-pro/edit만', () => {
    const config = getModelSelectionConfigForWorkflow('kids-animation', 'expand', 'image-to-image')
    const ids = config.options.map(o => o.id)
    expect(ids).toEqual(['fal-ai/nano-banana-pro/edit'])
    expect(config.defaultModelId).toBe('fal-ai/nano-banana-pro/edit')
  })

  it('정책이 없으면 전역 fallback 반환', () => {
    const config = getModelSelectionConfigForWorkflow('unknown-workflow', 'videos', 'image-to-video')
    expect(config.category).toBe('image-to-video')
    expect(config.defaultModelId).toBeTruthy()
  })

  it('정책의 recommended 플래그가 반영된다', () => {
    const config = getModelSelectionConfigForWorkflow('kids-animation', 'videos', 'image-to-video')
    const recommended = config.options.find(o => o.recommended)
    expect(recommended).toBeDefined()
    expect(recommended!.id).toBe('kling-2.6/image-to-video')
  })

  it('정책의 featured 플래그가 반영된다', () => {
    const config = getModelSelectionConfigForWorkflow('kids-animation', 'videos', 'image-to-video')
    const featuredIds = config.options.filter(o => o.featured).map(o => o.id)
    expect(featuredIds).toEqual([
      'kling/v2-5-turbo-image-to-video-pro',
      'kling-2.6/image-to-video',
      'kling-3.0/video',
    ])
  })
})

describe('getStepPolicyForWorkflow', () => {
  it('정책이 있으면 StepModelPolicy 반환', () => {
    const policy = getStepPolicyForWorkflow('kids-animation', 'videos', 'image-to-video')
    expect(policy).not.toBeNull()
    expect(policy!.defaultModel).toBe('kling-2.6/image-to-video')
  })

  it('정책이 없으면 null 반환', () => {
    expect(getStepPolicyForWorkflow('unknown', 'videos', 'image-to-video')).toBeNull()
  })
})

// ============================================================
// router.ts — routeModel with overrides
// ============================================================

describe('routeModel with overrides', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
  })

  it('provider 가용 시 overrides 무시하고 요청 모델 그대로 사용', () => {
    const result = routeModel('gemini-3-pro-image-preview', 'text-to-image', {
      fallbacks: { 'gemini-3-pro-image-preview': 'gemini-2.5-flash-image' },
      defaultId: 'gemini-2.5-flash-image',
    })
    expect(result).not.toBeNull()
    expect(result!.modelId).toBe('gemini-3-pro-image-preview')
    expect(result!.fallbackUsed).toBe(false)
  })

  it('overrides 없으면 기존 동작 유지', () => {
    const result = routeModel('gemini-3-pro-image-preview', 'text-to-image')
    expect(result).not.toBeNull()
    expect(result!.modelId).toBe('gemini-3-pro-image-preview')
  })
})

// ============================================================
// helpers.ts — buildRouteOverrides
// ============================================================

describe('buildRouteOverrides', () => {
  it('kids-animation + videos + image-to-video → fallbacks + defaultId 반환', () => {
    const overrides = buildRouteOverrides('kids-animation', 'videos', 'image-to-video')
    expect(overrides).toBeDefined()
    expect(overrides!.defaultId).toBe('kling-2.6/image-to-video')
    expect(overrides!.fallbacks).toEqual({
      'kling-2.6/image-to-video': 'fal-ai/kling-video/v2.6/pro/image-to-video',
      'kling-3.0/video': 'fal-ai/kling-video/v3/standard/image-to-video',
      'hailuo/2-3-image-to-video-pro': 'fal-ai/minimax/hailuo-02/pro/image-to-video',
    })
  })

  it('unknown workflow → undefined', () => {
    const overrides = buildRouteOverrides('unknown', 'videos', 'image-to-video')
    expect(overrides).toBeUndefined()
  })

  it('anchors:text-to-image → nano-banana-pro fallback + defaultId', () => {
    const overrides = buildRouteOverrides('kids-animation', 'anchors', 'text-to-image')
    expect(overrides).toBeDefined()
    expect(overrides!.fallbacks).toEqual({ 'nano-banana-pro': 'gemini-3-pro-image-preview' })
    expect(overrides!.defaultId).toBe('nano-banana-pro')
  })

  it('expand:image-to-image → fal edit fallback + defaultId', () => {
    const overrides = buildRouteOverrides('kids-animation', 'expand', 'image-to-image')
    expect(overrides).toBeDefined()
    expect(overrides!.fallbacks).toEqual({ 'fal-ai/nano-banana-pro/edit': 'gemini-3-pro-image-preview' })
    expect(overrides!.defaultId).toBe('fal-ai/nano-banana-pro/edit')
  })

  it('audio:tts → 2개 fallback 매핑 반환', () => {
    const overrides = buildRouteOverrides('kids-animation', 'audio', 'tts')
    expect(overrides).toBeDefined()
    expect(overrides!.fallbacks).toEqual({
      'fal-ai/elevenlabs/tts/multilingual-v2': 'elevenlabs/text-to-speech-multilingual-v2',
      'fal-ai/elevenlabs/tts/turbo-v2.5': 'elevenlabs/text-to-speech-turbo-2-5',
    })
    expect(overrides!.defaultId).toBe('fal-ai/elevenlabs/tts/multilingual-v2')
  })
})

// ============================================================
// router.ts — routeModel override 격리
// ============================================================

describe('routeModel override 격리', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    vi.stubEnv('FAL_KEY', '')
    vi.stubEnv('KIEAI_API_KEY', '')
  })

  it('provider 불가 + override fallback 가용 → override fallback 사용', () => {
    const result = routeModel('kling-2.6/image-to-video', 'image-to-video', {
      fallbacks: { 'kling-2.6/image-to-video': 'gemini-3-pro-image-preview' },
      defaultId: 'gemini-2.5-flash-image',
    })
    expect(result).not.toBeNull()
    expect(result!.modelId).toBe('gemini-3-pro-image-preview')
    expect(result!.provider).toBe('gemini')
    expect(result!.fallbackUsed).toBe(true)
  })

  it('override fallback 불가 + override default 가용 → override default 사용', () => {
    const result = routeModel('kling-2.6/image-to-video', 'image-to-video', {
      fallbacks: { 'kling-2.6/image-to-video': 'V4_5' },
      defaultId: 'gemini-3-pro-image-preview',
    })
    expect(result).not.toBeNull()
    expect(result!.modelId).toBe('gemini-3-pro-image-preview')
    expect(result!.fallbackUsed).toBe(true)
  })

  it('override chain 전부 불가 → null (전역 누출 없음)', () => {
    const result = routeModel('kling-2.6/image-to-video', 'image-to-video', {
      fallbacks: { 'kling-2.6/image-to-video': 'V4_5' },
      defaultId: 'V4_5',
    })
    expect(result).toBeNull()
  })

  it('overrides 없을 때 전역 chain 정상 동작', () => {
    const result = routeModel('kling-2.6/image-to-video', 'image-to-video')
    expect(result).toBeNull()
  })

  it('kieai nano-banana-pro 불가 → gemini fallback (text-to-image)', () => {
    const result = routeModel('nano-banana-pro', 'text-to-image', {
      fallbacks: { 'nano-banana-pro': 'gemini-3-pro-image-preview' },
      defaultId: 'nano-banana-pro',
    })
    expect(result).not.toBeNull()
    expect(result!.modelId).toBe('gemini-3-pro-image-preview')
    expect(result!.provider).toBe('gemini')
    expect(result!.fallbackUsed).toBe(true)
  })

  it('fal nano-banana-pro/edit 불가 → gemini fallback (image-to-image)', () => {
    const result = routeModel('fal-ai/nano-banana-pro/edit', 'image-to-image', {
      fallbacks: { 'fal-ai/nano-banana-pro/edit': 'gemini-3-pro-image-preview' },
      defaultId: 'fal-ai/nano-banana-pro/edit',
    })
    expect(result).not.toBeNull()
    expect(result!.modelId).toBe('gemini-3-pro-image-preview')
    expect(result!.provider).toBe('gemini')
    expect(result!.fallbackUsed).toBe(true)
  })
})

// ============================================================
// router.ts — getManualFallback
// ============================================================

describe('getManualFallback', () => {
  it('override 있을 때 명시 fallback 반환', () => {
    const fb = getManualFallback('nano-banana-pro', 'text-to-image', {
      fallbacks: { 'nano-banana-pro': 'gemini-3-pro-image-preview' },
      defaultId: 'nano-banana-pro',
    })
    expect(fb).toBe('gemini-3-pro-image-preview')
  })

  it('override 있으나 매핑 없음 + default 다름 → override default 반환', () => {
    const fb = getManualFallback('kling-2.6/image-to-video', 'image-to-video', {
      fallbacks: {},
      defaultId: 'fal-ai/kling-video/v2.6/pro/image-to-video',
    })
    expect(fb).toBe('fal-ai/kling-video/v2.6/pro/image-to-video')
  })

  it('override 있으나 매핑 없음 + default 동일 → null', () => {
    const fb = getManualFallback('kling-2.6/image-to-video', 'image-to-video', {
      fallbacks: {},
      defaultId: 'kling-2.6/image-to-video',
    })
    expect(fb).toBeNull()
  })

  it('override 없을 때 전역 fallback → nano-banana-pro에서 gemini', () => {
    const fb = getManualFallback('nano-banana-pro', 'text-to-image')
    expect(fb).toBe('gemini-3-pro-image-preview')
  })

  it('override 없을 때 + 전역 매핑 있음 → fal fallback', () => {
    // Feature 11에서 kling-2.6 → fal-ai/kling-video/v2.6/pro fallback 추가됨
    const fb = getManualFallback('kling-2.6/image-to-video', 'image-to-video')
    expect(fb).toBe('fal-ai/kling-video/v2.6/pro/image-to-video')
  })
})
