import { z } from 'zod'
import { createApiHandler } from '@/lib/api'
import { ApiError } from '@vibe-media-lab/shared'
import { imageToVideo, textToVideo } from '@/lib/services/video-service'
import { getAllowedIds, getModelConstraints } from '@/lib/models/helpers'
import { validateFetchUrl } from '@/lib/security/validate-url'
import type { GenerationResult } from '@/lib/services/types'

const generateRequestSchema = z.object({
  prompt: z.string().min(1, '프롬프트를 입력하세요').max(10000),
  model: z.string().optional(),
  duration: z.string().optional(),
  aspectRatio: z.string().optional(),
  resolution: z.string().optional(),
  sound: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
  tailImageUrl: z.string().url().optional(),
})

interface GenerateResponse {
  success: boolean
  url?: string
  error?: string
  metadata?: Record<string, unknown>
}

export const POST = createApiHandler<GenerateResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = generateRequestSchema.parse(body)

    const { prompt, model, duration, aspectRatio, resolution, sound, imageUrl, tailImageUrl } = validated
    const isI2V = !!imageUrl
    const capability = isI2V ? 'image-to-video' : 'text-to-video'

    // SSRF 방어: URL 화이트리스트 검증
    if (imageUrl) validateFetchUrl(imageUrl, { endpoint: '/api/video/generate', userId: user.id })
    if (tailImageUrl) validateFetchUrl(tailImageUrl, { endpoint: '/api/video/generate', userId: user.id })

    // Validate model against allowlist
    let validatedModel = model
    if (model) {
      try {
        const allowedIds = getAllowedIds(capability as 'image-to-video' | 'text-to-video')
        if (!(allowedIds as readonly string[]).includes(model)) {
          validatedModel = undefined // Fall back to service default
        }
      } catch {
        validatedModel = undefined
      }
    }

    // 모델별 제약 검증 (라우팅 전 빠른 400 반환)
    if (validatedModel) {
      const constraints = getModelConstraints(validatedModel)
      if (constraints) {
        if (duration && constraints.durations && !constraints.durations.includes(duration)) {
          throw ApiError.badRequest(
            `이 모델은 ${constraints.durations.join(', ')}초 길이만 지원합니다`,
          )
        }
        if (resolution && constraints.videoResolutions && !constraints.videoResolutions.includes(resolution)) {
          throw ApiError.badRequest(
            `이 모델은 ${constraints.videoResolutions.join(', ')} 해상도만 지원합니다`,
          )
        }
        // aspectRatio 검증 — aspectRatios: [] (미지원)은 스킵, 명시 목록만 체크
        if (aspectRatio && constraints.aspectRatios && constraints.aspectRatios.length > 0
            && !(constraints.aspectRatios as string[]).includes(aspectRatio)) {
          throw ApiError.badRequest(
            `이 모델은 ${constraints.aspectRatios.join(', ')} 비율만 지원합니다`,
          )
        }
        // sound 검증 — supportsSound 미정의/false인 모델에 sound:true 차단
        if (sound && !constraints.supportsSound) {
          throw ApiError.badRequest('이 모델은 사운드를 지원하지 않습니다')
        }
        // End frame 검증 — supportsEndFrame 미정의/false인 모델에 tailImageUrl 차단
        if (tailImageUrl && !constraints.supportsEndFrame) {
          throw ApiError.badRequest('이 모델은 End Frame을 지원하지 않습니다')
        }
      }
    }

    let result: GenerationResult

    if (isI2V) {
      result = await imageToVideo({
        imageUrl: imageUrl!,
        prompt,
        duration,
        aspectRatio,
        resolution,
        sound,
        tailImageUrl,
        model: validatedModel,
        userId: user.id,
      })
    } else {
      result = await textToVideo({
        prompt,
        duration,
        aspectRatio,
        resolution,
        sound,
        model: validatedModel,
        userId: user.id,
      })
    }

    return {
      success: result.success,
      url: result.url,
      error: result.error,
      metadata: result.metadata,
    }
  },
  { rateLimit: { maxRequests: 5, windowMs: 60_000 } },
)

export const maxDuration = 300
