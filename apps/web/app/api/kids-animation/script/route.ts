import { createApiHandler } from '@/lib/api'
import {
  KIDS_FORM_FACTOR_PRESETS,
  KIDS_ANIMATION_STYLES,
  type KidsStory,
  type KidsBasicStory,
  type KidsScript,
  type KidsShot,
} from '@vibe-media-lab/shared'
import { generateScript } from '@/lib/services'
import {
  ScriptRequestSchema,
  type ScriptResponse,
} from '@/lib/api/kids-animation/types'
import { getLogger } from '@/lib/logger'

const logger = getLogger('kids-animation/script')

interface AnchorPrompt {
  id: string
  category: 'character' | 'background'
  name: string
  prompt: string
}

/**
 * POST /api/kids-animation/script
 *
 * 스크립트 생성 (샷 분할 + 나레이션 + 비주얼 프롬프트 + 앵커 프롬프트)
 *
 * 서비스 연동:
 * - llmService.generateScript() 사용
 * - Gemini API 또는 Mock 모드로 동작
 *
 * Supports both legacy and enhanced (Zootopia Protocol) story formats
 */
export const POST = createApiHandler<ScriptResponse>(
  async (request) => {
    const body = await request.json()
    const validated = ScriptRequestSchema.parse(body)

    const { sessionId, story: inputStory, formFactor, style } = validated
    const formFactorConfig = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const styleConfig = KIDS_ANIMATION_STYLES[style]

    logger.debug('Input story received', {
      type: typeof inputStory,
      keys: inputStory ? Object.keys(inputStory) : null,
    })

    // 스토리를 generateScript에 맞는 형식으로 변환
    // (flexible schema에서 KidsStory | KidsBasicStory로)
    const story = inputStory as KidsStory | KidsBasicStory

    // 스크립트 생성
    const generatedScript = await generateScript({
      story,
      style,
      maxShots: formFactorConfig.maxShots,
    })

    // GeneratedScript를 KidsScript로 변환
    const script: KidsScript = {
      totalDuration: generatedScript.totalDuration,
      shotCount: generatedScript.shotCount,
      shots: generatedScript.shots.map((shot): KidsShot => ({
        id: shot.id,
        shotNumber: shot.shotNumber,
        duration: shot.duration,
        narration: shot.narration,
        visualPrompt: shot.visualPrompt,
        // Enhanced fields (Zootopia Protocol)
        actKey: shot.actKey,
        actTitle: shot.actTitle,
        emotion: shot.emotion,
        voiceId: shot.voiceId,
        speechStyle: shot.speechStyle,
        speaker: shot.speaker,
        cameraMovement: shot.cameraMovement,
        characters: shot.characters,
        location: shot.location,
      })),
      bgmPrompt: generatedScript.bgmPrompt,
    }

    // 앵커 프롬프트 추출 (캐릭터 + 배경)
    // 캐릭터: 캐릭터 시트용 (흰 배경, 전신, 정면)
    // 배경: 환경 전용 (캐릭터 없이 배경만)
    const anchorPrompts: AnchorPrompt[] = []

    logger.debug('Story structure', {
      keys: Object.keys(story),
      hasCharacters: 'characters' in story,
      characterCount: (story as KidsStory).characters?.length,
      hasSetting: 'setting' in story,
    })

    // 캐릭터 앵커 프롬프트 (Enhanced 스토리인 경우)
    if ('characters' in story && Array.isArray(story.characters)) {
      story.characters.forEach((char, idx) => {
        // 캐릭터 단일 이미지 프롬프트: 흰 배경, 전신, 정면(0도), 텍스트 없음
        const baseDescription = char.visualDescription || `A cute ${char.species} character named ${char.name}`
        anchorPrompts.push({
          id: `char-${idx + 1}`,
          category: 'character',
          name: char.name,
          prompt: `Single character illustration. ${baseDescription}. CAMERA ANGLE: Perfectly frontal 0-degree angle, character facing straight into camera, both eyes equally visible, symmetrical face, nose pointing directly at viewer. Full body visible, centered composition, standing pose with arms naturally at sides, plain white background, no shadows, high detail, one character only, no multiple views, no multiple angles, no text, no labels, no watermarks, ${styleConfig.visualPromptSuffix}`,
        })
      })
    }

    // 배경 앵커 프롬프트 (setting에서 추출)
    // locationVisualDescriptions가 있으면 사용, 없으면 location 이름 기반으로 생성
    if ('setting' in story && story.setting) {
      const locations = story.setting.mainLocations || []
      const visualDescriptions = story.setting.locationVisualDescriptions || []
      const worldContext = story.setting.world || 'magical fantasy world'

      logger.debug('Background info', {
        locationCount: locations.length,
        descriptionCount: visualDescriptions.length,
        world: worldContext,
      })

      locations.forEach((location, idx) => {
        // LLM이 생성한 영어 설명이 있으면 사용
        const hasVisualDesc = visualDescriptions[idx] && visualDescriptions[idx].trim().length > 0

        // location 이름을 영어로 변환하거나 그대로 사용 (프롬프트에 포함)
        // 프롬프트에 location 이름을 명시적으로 포함하여 관련성 보장
        const locationPrompt = hasVisualDesc
          ? `${visualDescriptions[idx]}`
          : `A beautiful ${location} in a ${worldContext}, detailed environment with atmospheric lighting, fantasy animation style`

        anchorPrompts.push({
          id: `bg-${idx + 1}`,
          category: 'background',
          name: location,
          prompt: `Environment concept art for animation. Scene: "${location}". ${locationPrompt}. COMPOSITION: Extreme wide establishing shot, 120-degree panoramic field of view, entire environment visible from edge to edge, maximum distance showing full scope of location, tiny details visible in far background. Cinematic lighting, vibrant colors, detailed environment painting, absolutely no characters, no people, no creatures, no animals in the scene, empty background only, ${styleConfig.visualPromptSuffix}`,
        })
      })
    }

    logger.debug('Anchor prompts generated', {
      count: anchorPrompts.length,
      anchors: anchorPrompts.map((a) => ({ id: a.id, category: a.category, name: a.name })),
    })

    return {
      sessionId,
      script,
      anchorPrompts,
    }
  },
  { rateLimit: { maxRequests: 10, windowMs: 60_000 } }
)
