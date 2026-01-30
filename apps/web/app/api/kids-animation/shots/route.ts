import { createApiHandler } from '@/lib/api'
import { KIDS_ANIMATION_STYLES, KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { batchEditImages } from '@/lib/services'
import {
  ShotsRequestSchema,
  type ShotsResponse,
} from '@/lib/api/kids-animation/types'

/**
 * POST /api/kids-animation/shots
 *
 * 샷 이미지 생성 (배치 처리)
 *
 * 서비스 연동:
 * - imageService.batchEditImages() 사용
 * - 최대 7개 동시 처리 (KIDS_BATCH_LIMITS.image)
 */
export const POST = createApiHandler<ShotsResponse>(
  async (request, { user, requestId }) => {
    const body = await request.json()
    const validated = ShotsRequestSchema.parse(body)

    const { sessionId, script, anchors, style, formFactor = 'longform' } = validated
    const styleConfig = KIDS_ANIMATION_STYLES[style]
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]

    // 앵커 이미지 URL 추출
    const anchorUrls = anchors.map((a) => a.url)

    // 배치 이미지 생성 태스크 준비
    const tasks = script.shots.map((shot) => ({
      referenceUrls: anchorUrls,
      prompt: `${shot.visualPrompt}. ${styleConfig.visualPromptSuffix}`,
    }))

    // 이미지 서비스를 통한 배치 생성 (formFactor에 따른 aspectRatio, resolution 적용)
    const batchResult = await batchEditImages({
      tasks,
      aspectRatio: formFactorPreset.shot.aspectRatio,
      resolution: formFactorPreset.shot.resolution,
    })

    // 결과 매핑
    const shots = script.shots.map((shot, idx) => {
      const result = batchResult.results[idx]
      return {
        id: shot.id,
        shotNumber: shot.shotNumber,
        duration: shot.duration as 5 | 10,
        narration: shot.narration,
        visualPrompt: shot.visualPrompt,
        imageUrl: result?.url || `https://picsum.photos/seed/${Date.now() + idx}/800/450`,
      }
    })

    return {
      sessionId,
      shots,
    }
  }
)
