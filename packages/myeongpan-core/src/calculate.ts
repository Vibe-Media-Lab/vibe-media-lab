import { BirthProfileSchema } from './schemas.js'
import { computeConfigHash } from './utils.js'
import { normalizeBirthProfile } from './input/normalize.js'
import { computeSaju } from './engines/saju.js'
import { computeZiwei } from './engines/ziwei.js'
import { computeWestern } from './engines/western.js'
import type { BirthProfile, UnifiedChart, SajuChart, ZiweiChart, WesternChart, ChartError } from './types.js'

/** 라이브러리 버전 (package.json에서 고정) */
const ENGINE_VERSIONS = {
  manseryeok: '1.0.7',
  iztro: '2.5.7',
  celestine: '0.2.1',
}

/**
 * 3체계 통합 차트 계산
 *
 * BirthProfile → Zod 검증 → 정규화 → 3개 엔진 병렬 실행 → UnifiedChart
 *
 * - unknownTime: 사주만 계산 (3주), 자미두수/서양점성 생략
 * - 개별 엔진 실패 시 해당 체계만 null, 나머지는 정상 반환
 */
export async function calculateUnifiedChart(profile: BirthProfile): Promise<UnifiedChart> {
  // 1. Zod 검증 (연도 범위 1900-2050 포함)
  const validated = BirthProfileSchema.parse(profile)

  // 2. 정규화 (음력→양력 변환 포함)
  const inputs = normalizeBirthProfile(validated)

  // 3. 병렬 실행 — tagged 패턴으로 실패 엔진 정확 식별
  const errors: ChartError[] = []
  const warnings: string[] = []
  const systemsCompleted: ('saju' | 'ziwei' | 'western')[] = []

  let saju: SajuChart | null = null
  let ziwei: ZiweiChart | null = null
  let western: WesternChart | null = null

  type SystemTag = 'saju' | 'ziwei' | 'western'
  type EngineResult =
    | { system: 'saju'; result: SajuChart }
    | { system: 'ziwei'; result: ZiweiChart }
    | { system: 'western'; result: WesternChart }

  const tagged: { system: SystemTag; promise: Promise<EngineResult> }[] = [
    {
      system: 'saju',
      promise: Promise.resolve().then(() => ({
        system: 'saju' as const,
        result: computeSaju(inputs.saju),
      })),
    },
  ]

  if (validated.unknownTime) {
    warnings.push('출생시간 미상: 자미두수/서양점성 계산 생략')
  } else {
    if (inputs.ziwei) {
      tagged.push({
        system: 'ziwei',
        promise: Promise.resolve().then(() => ({
          system: 'ziwei' as const,
          result: computeZiwei(inputs.ziwei!),
        })),
      })
    }
    if (inputs.western) {
      tagged.push({
        system: 'western',
        promise: Promise.resolve().then(() => ({
          system: 'western' as const,
          result: computeWestern(inputs.western!),
        })),
      })
    }
  }

  // 4. 결과 수집
  const results = await Promise.allSettled(tagged.map((t) => t.promise))

  for (let i = 0; i < results.length; i++) {
    const r = results[i]!
    if (r.status === 'fulfilled') {
      const { system, result } = r.value
      systemsCompleted.push(system)
      if (system === 'saju') saju = result as SajuChart
      else if (system === 'ziwei') ziwei = result as ZiweiChart
      else if (system === 'western') western = result as WesternChart
    } else {
      // tagged 배열에서 시스템 이름 직접 참조 — 인덱스 추정 버그 방지
      const failedSystem = tagged[i]!.system
      const errorMsg = r.reason instanceof Error ? r.reason.message : String(r.reason)
      errors.push({ system: failedSystem, message: errorMsg })
    }
  }

  return {
    saju,
    ziwei,
    western,
    meta: {
      engineVersions: ENGINE_VERSIONS,
      configHash: computeConfigHash(profile),
      generatedAt: new Date().toISOString(),
      systemsCompleted,
      errors,
      warnings,
    },
  }
}
