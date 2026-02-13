import { z } from 'zod'
import { createApiHandler } from '@/lib/api'
import { ApiError } from '@vibe-media-lab/shared'
import { generateImage, editImage } from '@/lib/services/image-service'
import { getAllowedIds, getModelConstraints } from '@/lib/models/helpers'
import type { GenerationResult } from '@/lib/services/types'

const AspectRatioSchema = z.enum([
  '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9',
])

const ResolutionSchema = z.enum(['1K', '2K', '4K'])

const generateRequestSchema = z.object({
  prompt: z.string().min(1, '프롬프트를 입력하세요').max(5000),
  aspectRatio: AspectRatioSchema.optional().default('1:1'),
  resolution: ResolutionSchema.optional().default('2K'),
  model: z.string().optional(),
  count: z.number().int().min(1).max(4).optional().default(1),
  referenceUrls: z.array(z.string().url()).max(14).optional(),
})

interface GenerateResultItem {
  success: boolean
  url?: string
  dbId?: string
  error?: string
  metadata?: Record<string, unknown>
}

interface GenerateResponse {
  results: GenerateResultItem[]
}

export const POST = createApiHandler<GenerateResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = generateRequestSchema.parse(body)

    const { prompt, aspectRatio, resolution, model, count, referenceUrls } = validated
    const hasReferences = referenceUrls && referenceUrls.length > 0

    // Validate model against combined whitelist
    const GEMINI_FALLBACK_MODELS = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']
    let validatedModel = model
    if (model) {
      const capability = hasReferences ? 'image-to-image' : 'text-to-image'
      try {
        const allowedIds = getAllowedIds(capability as 'text-to-image' | 'image-to-image')
        const allAllowed = [...allowedIds, ...GEMINI_FALLBACK_MODELS]
        if (!allAllowed.includes(model)) {
          validatedModel = undefined // Fall back to service default
        }
      } catch {
        validatedModel = undefined
      }
    }

    // 모델별 제약 검증 (요청 모델 기준 — 라우팅 전 빠른 400 반환, fallback 발생 시 제약 완화 가능)
    if (validatedModel) {
      const constraints = getModelConstraints(validatedModel)
      if (constraints) {
        // 참조 이미지 수 검증
        if (hasReferences && referenceUrls && constraints.maxRefImages !== undefined) {
          if (referenceUrls.length > constraints.maxRefImages) {
            throw ApiError.badRequest(
              `이 모델은 최대 ${constraints.maxRefImages}개의 참조 이미지만 지원합니다`,
            )
          }
        }
        // 해상도 검증
        if (constraints.resolutions && !constraints.resolutions.includes(resolution)) {
          throw ApiError.badRequest(
            `이 모델은 ${constraints.resolutions.join(', ')} 해상도만 지원합니다`,
          )
        }
        // 비율 검증
        if (constraints.aspectRatios && !constraints.aspectRatios.includes(aspectRatio)) {
          throw ApiError.badRequest(
            `이 모델은 ${constraints.aspectRatios.join(', ')} 비율만 지원합니다`,
          )
        }
      }
    }

    // Generate images in parallel
    const tasks = Array.from({ length: count }, async (): Promise<GenerateResultItem> => {
      try {
        let result: GenerationResult

        if (hasReferences) {
          result = await editImage({
            prompt,
            referenceUrls: referenceUrls!,
            aspectRatio,
            resolution,
            model: validatedModel,
            userId: user.id,
          })
        } else {
          result = await generateImage({
            prompt,
            aspectRatio,
            resolution,
            model: validatedModel,
            userId: user.id,
          })
        }

        return {
          success: result.success,
          url: result.url,
          dbId: result.dbId,
          error: result.error,
          metadata: result.metadata,
        }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : '이미지 생성 실패',
        }
      }
    })

    const results = await Promise.allSettled(tasks)
    const items: GenerateResultItem[] = results.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { success: false, error: r.reason?.message || '이미지 생성 실패' },
    )

    return { results: items }
  },
  { rateLimit: { maxRequests: 10, windowMs: 60_000 } },
)

export const maxDuration = 300
