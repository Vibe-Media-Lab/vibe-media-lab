import type { ModelSelectionConfig, ModelOption, ModelConstraints } from '@vibe-media-lab/shared'
import type { CatalogModel, ModelCapability, StepModelPolicy } from './types'
import type { RouteOverrides } from './router'
import { MODEL_CATALOG } from './catalog'
import { ENABLED } from './enabled'
import { getStepPolicy } from './workflow-policies'

// ─── Private Helpers (반드시 사용처보다 위에 선언 — Turbopack 호이스팅 이슈 방지) ───

function providerLabel(p: string): string {
  switch (p) {
    case 'fal': return 'fal.ai'
    case 'kieai': return 'Kie.ai'
    case 'gemini': return 'Google'
    default: return p
  }
}

/** CatalogModel → ModelConstraints 변환 (없으면 undefined) */
function buildConstraints(catalog: CatalogModel): ModelConstraints | undefined {
  if (!catalog.constraints) return undefined
  const { maxRefImages, resolutions, aspectRatios, durations, videoResolutions, supportsSound, supportsEndFrame } = catalog.constraints

  // 빈 배열도 "명시적 제약"으로 취급 (aspectRatios: [] = 미지원)
  const hasRes = resolutions && resolutions.length > 0
  const hasAspectRatios = aspectRatios !== undefined
  const hasDurations = durations && durations.length > 0
  const hasVideoRes = videoResolutions && videoResolutions.length > 0
  const hasSound = supportsSound !== undefined
  const hasEndFrame = supportsEndFrame !== undefined

  if (maxRefImages === undefined && !hasRes && !hasAspectRatios && !hasDurations && !hasVideoRes && !hasSound && !hasEndFrame) {
    return undefined
  }

  return {
    maxRefImages,
    resolutions: hasRes ? (resolutions as ModelConstraints['resolutions']) : undefined,
    aspectRatios: hasAspectRatios ? (aspectRatios as ModelConstraints['aspectRatios']) : undefined,
    durations: hasDurations ? durations : undefined,
    videoResolutions: hasVideoRes ? videoResolutions : undefined,
    supportsSound,
    supportsEndFrame,
  }
}

// ─── Exports ───

/** 모델 ID로 constraints 직접 조회 (Store/API용) */
export function getModelConstraints(modelId: string): ModelConstraints | undefined {
  const catalog = MODEL_CATALOG.find(m => m.id === modelId)
  if (!catalog?.constraints) return undefined
  return buildConstraints(catalog)
}

/** capability → UI용 ModelSelectionConfig 생성 */
export function getModelSelectionConfig(capability: ModelCapability): ModelSelectionConfig {
  const config = ENABLED[capability]
  if (!config || config.models.length === 0) {
    return { category: capability, options: [], defaultModelId: '' }
  }

  const options: ModelOption[] = config.models
    .map((id): ModelOption | null => {
      const catalog = MODEL_CATALOG.find(m => m.id === id)
      if (!catalog) return null
      return {
        id: catalog.id,
        label: catalog.label,
        recommended: config.recommendedId === id,
        featured: config.featured.includes(id),
        description: catalog.description,
        meta: {
          provider: providerLabel(catalog.provider),
          quality: catalog.meta.quality,
          speed: catalog.meta.speed,
          cost: catalog.meta.cost,
          badge: catalog.meta.badge,
        },
        constraints: buildConstraints(catalog),
      }
    })
    .filter((o): o is ModelOption => o !== null)

  return {
    category: capability,
    options,
    defaultModelId: config.defaultId,
  }
}

/** 워크플로우 정책 기반 ModelSelectionConfig — 정책 없으면 전역 fallback */
export function getModelSelectionConfigForWorkflow(
  workflowId: string,
  stepId: string,
  capability: ModelCapability,
): ModelSelectionConfig {
  const stepPolicy = getStepPolicy(workflowId, stepId, capability)
  if (!stepPolicy) return getModelSelectionConfig(capability)

  const options: ModelOption[] = stepPolicy.allowedModels
    .map((id): ModelOption | null => {
      const catalog = MODEL_CATALOG.find(m => m.id === id)
      if (!catalog) return null
      return {
        id: catalog.id,
        label: catalog.label,
        recommended: stepPolicy.recommendedModel === id,
        featured: stepPolicy.featured.includes(id),
        description: catalog.description,
        meta: {
          provider: providerLabel(catalog.provider),
          quality: catalog.meta.quality,
          speed: catalog.meta.speed,
          cost: catalog.meta.cost,
          badge: catalog.meta.badge,
        },
        constraints: buildConstraints(catalog),
      }
    })
    .filter((o): o is ModelOption => o !== null)

  // 정책 모델이 카탈로그에 없어서 빈 목록이면 전역 fallback
  if (options.length === 0) {
    return getModelSelectionConfig(capability)
  }

  return {
    category: capability,
    options,
    defaultModelId: stepPolicy.defaultModel,
  }
}

/** 워크플로우 정책 기반 StepModelPolicy 조회 (라우터/마이그레이션용) */
export function getStepPolicyForWorkflow(
  workflowId: string,
  stepId: string,
  capability: ModelCapability,
): StepModelPolicy | null {
  return getStepPolicy(workflowId, stepId, capability)
}

/** 워크플로우 정책에서 RouteOverrides 빌드 (정책 없으면 undefined) */
export function buildRouteOverrides(
  workflowId: string,
  stepId: string,
  capability: ModelCapability,
): RouteOverrides | undefined {
  const policy = getStepPolicy(workflowId, stepId, capability)
  if (!policy) return undefined
  return {
    fallbacks: Object.keys(policy.fallbacks).length > 0 ? policy.fallbacks : undefined,
    defaultId: policy.defaultModel,
  }
}

/** Zod enum용 allowed IDs 추출 */
export function getAllowedIds(capability: ModelCapability): readonly [string, ...string[]] {
  const ids = ENABLED[capability].models
  if (ids.length === 0) throw new Error(`No enabled models for ${capability}`)
  return ids as unknown as [string, ...string[]]
}
