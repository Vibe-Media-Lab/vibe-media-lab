import type { ModelProvider, ResultMeta } from './types'
import { MODEL_CATALOG } from './catalog'
import { ENABLED } from './enabled'
import { isFalAvailable } from '@/lib/services/fal-client'
import { isKieaiAvailable } from '@/lib/services/kieai-client'

// ─── Routing Result ───

export interface RouteResult {
  modelId: string
  provider: ModelProvider
  fallbackUsed: boolean
}

// ─── Route Overrides (워크플로우 정책용) ───

export interface RouteOverrides {
  fallbacks?: Record<string, string>
  defaultId?: string
}

// ─── Provider Resolution ───

/**
 * modelId → provider 결정
 *
 * 1) 카탈로그에 명시된 provider 우선 (wan/* 비디오 = kieai vs wan/* 이미지 = fal 구분)
 * 2) Prefix 기반 fallback (카탈로그 미등록 모델)
 */
export function resolveProvider(modelId: string): ModelProvider {
  // 1) 카탈로그 우선 룩업
  const catalog = MODEL_CATALOG.find(m => m.id === modelId)
  if (catalog) return catalog.provider

  // 2) Prefix 기반 fallback
  if (modelId.startsWith('fal-ai/')) return 'fal'
  if (modelId.startsWith('wan/')) return 'fal' // 이미지 wan/* 기본값
  if (modelId.startsWith('gemini-')) return 'gemini'
  return 'kieai'
}

/** provider 가용 여부 */
export function isProviderAvailable(provider: ModelProvider): boolean {
  switch (provider) {
    case 'fal': return isFalAvailable()
    case 'gemini': return !!process.env.GEMINI_API_KEY
    case 'kieai': return isKieaiAvailable()
  }
}

// ─── Fallback ───

/** fallback 모델 조회 (capability별 명시 매핑) */
export function getFallbackModel(modelId: string, capability: string): string | null {
  const config = ENABLED[capability as keyof typeof ENABLED]
  return config?.fallbacks[modelId] ?? null
}

// ─── Routing ───

/**
 * 라우팅: 요청 모델 → 실제 사용 모델 결정
 *
 * overrides 제공 시 override-only chain (전역 누출 방지):
 *   override fallback → override default → null
 * overrides 없으면 전역 chain:
 *   global fallback → global default → null
 *
 * null 반환 시 모든 provider가 불가 → 호출자가 { success: false } 반환
 */
export function routeModel(
  requestedModelId: string,
  capability: string,
  overrides?: RouteOverrides,
): RouteResult | null {
  const provider = resolveProvider(requestedModelId)

  // 1) provider 가용 시 그대로 사용
  if (isProviderAvailable(provider)) {
    return { modelId: requestedModelId, provider, fallbackUsed: false }
  }

  // 2) overrides 제공 시 override-only chain (전역 누출 방지)
  if (overrides) {
    const fb = overrides.fallbacks?.[requestedModelId]
    if (fb) {
      const fbProvider = resolveProvider(fb)
      if (isProviderAvailable(fbProvider)) {
        return { modelId: fb, provider: fbProvider, fallbackUsed: true }
      }
    }
    if (overrides.defaultId) {
      const defProvider = resolveProvider(overrides.defaultId)
      if (isProviderAvailable(defProvider)) {
        return { modelId: overrides.defaultId, provider: defProvider, fallbackUsed: true }
      }
    }
    return null // 전역으로 누출하지 않음
  }

  // 3) overrides 없으면 전역 chain
  const globalFallbackId = getFallbackModel(requestedModelId, capability)
  if (globalFallbackId) {
    const fallbackProvider = resolveProvider(globalFallbackId)
    if (isProviderAvailable(fallbackProvider)) {
      return { modelId: globalFallbackId, provider: fallbackProvider, fallbackUsed: true }
    }
  }

  const config = ENABLED[capability as keyof typeof ENABLED]
  if (config?.defaultId) {
    const defaultProvider = resolveProvider(config.defaultId)
    if (isProviderAvailable(defaultProvider)) {
      return { modelId: config.defaultId, provider: defaultProvider, fallbackUsed: true }
    }
  }

  // 4) 모든 provider 불가
  return null
}

/** 수동 fallback 모델 조회 (런타임 API 에러 후 대체) */
export function getManualFallback(
  triedModelId: string,
  capability: string,
  overrides?: RouteOverrides,
): string | null {
  if (overrides) {
    const fb = overrides.fallbacks?.[triedModelId]
    if (fb) return fb
    if (overrides.defaultId && overrides.defaultId !== triedModelId) return overrides.defaultId
    return null
  }
  return getFallbackModel(triedModelId, capability)
}

// ─── Result Metadata ───

/** ResultMeta 생성 헬퍼 */
export function buildResultMeta(
  requestedModel: string,
  route: RouteResult,
  startTime: number,
): ResultMeta {
  return {
    requestedModel,
    actualModel: route.modelId,
    actualProvider: route.provider,
    latencyMs: Date.now() - startTime,
    fallbackUsed: route.fallbackUsed,
  }
}
