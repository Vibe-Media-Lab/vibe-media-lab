import { createApiHandler } from '@/lib/api'
import { generateStory } from '@/lib/services'
import {
  StoryRequestSchema,
  type StoryResponse,
} from '@/lib/api/kids-animation/types'

/**
 * POST /api/kids-animation/story
 *
 * 스토리 생성 (6단계 플롯 구조)
 *
 * 서비스 연동:
 * - llmService.generateStory() 사용
 * - Gemini API 또는 Mock 모드로 동작
 */
export const POST = createApiHandler<StoryResponse>(
  async (request, { user, requestId }) => {
    const body = await request.json()
    const validated = StoryRequestSchema.parse(body)

    const { sessionId, topic, formFactor, style } = validated

    // LLM 서비스를 통한 스토리 생성
    // formFactor는 스토리 생성에 직접 영향 없음 (이미지/비디오 단계에서 사용)
    const story = await generateStory({
      topic,
      style,
      quality: 'standard', // 스토리 생성은 quality 고정
    })

    return {
      sessionId,
      story,
    }
  }
)
