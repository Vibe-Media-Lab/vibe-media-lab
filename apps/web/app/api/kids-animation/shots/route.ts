import { createApiHandler } from '@/lib/api'
import { KIDS_ANIMATION_STYLES, KIDS_FORM_FACTOR_PRESETS } from '@vibe-media-lab/shared'
import { batchEditImages, editImage } from '@/lib/services'
import {
  ShotsRequestSchema,
  type ShotsResponse,
} from '@/lib/api/kids-animation/types'
import { buildRouteOverrides } from '@/lib/models/helpers'
import { getLogger } from '@/lib/logger'
import { selectReferenceImages } from '@/lib/utils/shot-anchor-mapper'

const logger = getLogger('api/kids-animation/shots')

const MAX_RETRIES = 2

/**
 * POST /api/kids-animation/shots
 *
 * 샷 이미지 생성 (배치 처리 + 실패 샷 개별 재시도)
 *
 * 서비스 연동:
 * - imageService.batchEditImages() 사용
 * - 최대 7개 동시 처리 (KIDS_BATCH_LIMITS.image)
 * - 실패한 샷은 editImage()로 개별 재시도 (최대 2회)
 */
export const POST = createApiHandler<ShotsResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = ShotsRequestSchema.parse(body)

    const { sessionId, projectId, script, anchors, expanded, style, formFactor = 'longform', model } = validated
    const styleConfig = KIDS_ANIMATION_STYLES[style]
    const formFactorPreset = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const routeOverrides = buildRouteOverrides('kids-animation', 'shots', 'image-to-image')

    // 샷별 참조 이미지 매핑
    const tasks = script.shots.map((shot) => {
      const referenceUrls = selectReferenceImages(
        { characters: shot.characters, location: shot.location, emotion: shot.emotion, speaker: shot.speaker },
        anchors,
        expanded,
      )

      logger.debug('Shot reference mapping', {
        shotId: shot.id,
        characters: shot.characters,
        location: shot.location,
        emotion: shot.emotion,
        referenceCount: referenceUrls.length,
        totalAnchors: anchors.length,
      })

      return {
        referenceUrls,
        prompt: `${shot.visualPrompt}. ${styleConfig.visualPromptSuffix}`,
      }
    })

    // 이미지 서비스를 통한 배치 생성 (userId 전달하면 자동으로 Library에 저장됨)
    const batchStartTime = Date.now()
    const batchResult = await batchEditImages({
      tasks,
      aspectRatio: formFactorPreset.shot.aspectRatio,
      resolution: formFactorPreset.shot.resolution,
      model,
      routeOverrides,
      userId: user.id,
      projectId,
      sessionId,
      metadata: { style, formFactor },
    })

    const batchElapsedMs = Date.now() - batchStartTime
    logger.info('Batch edit completed', {
      sessionId,
      totalTasks: tasks.length,
      totalSuccess: batchResult.totalSuccess,
      totalFailed: batchResult.totalFailed,
      elapsedMs: batchElapsedMs,
    })

    // 실패한 샷 개별 재시도
    const retryStartTime = Date.now()
    if (batchResult.totalFailed > 0) {
      logger.warn('Some shots failed, retrying individually', {
        sessionId,
        totalFailed: batchResult.totalFailed,
        failedIndices: batchResult.results
          .filter(r => !r.success)
          .map(r => r.index),
      })

      for (const result of batchResult.results) {
        if (result.success && result.url) continue

        const task = tasks[result.index]
        if (!task) continue

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          logger.info('Retrying failed shot', {
            sessionId,
            shotIndex: result.index,
            attempt,
          })

          const retryResult = await editImage({
            prompt: task.prompt,
            referenceUrls: task.referenceUrls,
            aspectRatio: formFactorPreset.shot.aspectRatio,
            resolution: formFactorPreset.shot.resolution,
            model,
            routeOverrides,
            userId: user.id,
            projectId,
            sessionId,
            metadata: { style, formFactor, retryAttempt: attempt },
          })

          if (retryResult.success && retryResult.url) {
            result.success = true
            result.url = retryResult.url
            result.error = undefined
            logger.info('Shot retry succeeded', {
              sessionId,
              shotIndex: result.index,
              attempt,
            })
            break
          }

          logger.warn('Shot retry failed', {
            sessionId,
            shotIndex: result.index,
            attempt,
            error: retryResult.error,
          })
        }
      }
    }

    if (batchResult.totalFailed > 0) {
      const retryElapsedMs = Date.now() - retryStartTime
      logger.info('Retry phase completed', {
        sessionId,
        retryElapsedMs,
      })
    }

    // 결과 매핑 - 재시도 후에도 실패한 샷은 에러 로깅
    const finalFailedCount = batchResult.results.filter(r => !r.success || !r.url).length
    if (finalFailedCount > 0) {
      logger.error('Shots failed after all retries', {
        sessionId,
        finalFailedCount,
        failedIndices: batchResult.results
          .filter(r => !r.success || !r.url)
          .map(r => r.index),
      })
    }

    const shots = script.shots.map((shot, idx) => {
      const result = batchResult.results[idx]

      return {
        id: shot.id,
        shotNumber: shot.shotNumber,
        duration: shot.duration as 5 | 10,
        narration: shot.narration,
        visualPrompt: shot.visualPrompt,
        imageUrl: result?.url || '',
      }
    })

    // 전체 실패 시 에러 반환
    if (shots.every(s => !s.imageUrl)) {
      throw new Error('모든 샷 이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }

    return {
      sessionId,
      shots,
    }
  },
  { rateLimit: { maxRequests: 10, windowMs: 60_000 } }
)

// 샷 이미지 생성은 시간이 오래 걸림
export const maxDuration = 300
