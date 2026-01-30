import { createApiHandler } from '@/lib/api'
import {
  KIDS_FORM_FACTOR_PRESETS,
  KIDS_ANIMATION_STYLES,
  type KidsStory,
  type KidsBasicStory,
  type KidsScript,
  type KidsShot,
} from '@vibe-media-lab/shared'
import { generateScript, type GeneratedScript } from '@/lib/services'
import {
  ScriptRequestSchema,
  type ScriptResponse,
} from '@/lib/api/kids-animation/types'

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
  async (request, { user, requestId }) => {
    const body = await request.json()
    const validated = ScriptRequestSchema.parse(body)

    const { sessionId, story: inputStory, formFactor, style } = validated
    const formFactorConfig = KIDS_FORM_FACTOR_PRESETS[formFactor]
    const styleConfig = KIDS_ANIMATION_STYLES[style]

    // DEBUG: 입력된 스토리 구조 확인
    console.log('[script] inputStory type:', typeof inputStory)
    console.log('[script] inputStory keys:', inputStory ? Object.keys(inputStory) : 'null')

    // 스토리를 generateScript에 맞는 형식으로 변환
    // (flexible schema에서 KidsStory | KidsBasicStory로)
    const story = inputStory as KidsStory | KidsBasicStory

    // 스크립트 생성
    const generatedScript = await generateScript({
      story,
      style,
      quality: 'standard', // 스크립트 품질은 고정
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
      })),
      bgmPrompt: generatedScript.bgmPrompt,
    }

    // 앵커 프롬프트 추출 (캐릭터 + 배경)
    // 캐릭터: 캐릭터 시트용 (흰 배경, 전신, 정면)
    // 배경: 환경 전용 (캐릭터 없이 배경만)
    const anchorPrompts: AnchorPrompt[] = []

    // DEBUG: 스토리 구조 확인
    console.log('[script] story keys:', Object.keys(story))
    console.log('[script] has characters:', 'characters' in story)
    console.log('[script] characters:', (story as KidsStory).characters)
    console.log('[script] has setting:', 'setting' in story)
    console.log('[script] setting:', (story as KidsStory).setting)

    // 캐릭터 앵커 프롬프트 (Enhanced 스토리인 경우)
    if ('characters' in story && Array.isArray(story.characters)) {
      story.characters.forEach((char, idx) => {
        // 캐릭터 시트용 프롬프트: 흰 배경, 전신, 정면, 텍스트 없음
        const baseDescription = char.visualDescription || `A cute ${char.species} character named ${char.name}`
        anchorPrompts.push({
          id: `char-${idx + 1}`,
          category: 'character',
          name: char.name,
          prompt: `Character design sheet. ${baseDescription}. Full body, front view, centered, standing pose, clean white background, no shadows, high detail, no text, no labels, no watermarks, no letters, no words, ${styleConfig.visualPromptSuffix}`,
        })
      })
    }

    // 배경 앵커 프롬프트 (setting에서 추출)
    // locationVisualDescriptions가 있으면 사용, 없으면 기본 변형 사용
    if ('setting' in story && story.setting) {
      const locations = story.setting.mainLocations || []
      const visualDescriptions = story.setting.locationVisualDescriptions || []

      // DEBUG: 배경 정보 확인
      console.log('[script] locations:', locations)
      console.log('[script] visualDescriptions:', visualDescriptions)

      // 기본 변형 (locationVisualDescriptions가 없을 때 fallback)
      const fallbackVariations = [
        'grand entrance area with ornate decorations, welcoming atmosphere',
        'mysterious pathway with magical elements, enchanted vegetation',
        'serene central location with beautiful scenery, ambient lighting',
        'hidden corner with unique features, atmospheric mood',
        'expansive vista with dramatic landscape, epic scale',
      ]

      locations.forEach((location, idx) => {
        // LLM이 생성한 영어 설명이 있으면 사용, 없으면 fallback
        const visualDesc = visualDescriptions[idx] || fallbackVariations[idx % fallbackVariations.length]

        anchorPrompts.push({
          id: `bg-${idx + 1}`,
          category: 'background',
          name: location,
          prompt: `Environment concept art for animation. ${visualDesc}. Wide establishing shot, cinematic lighting, vibrant colors, detailed environment painting, no characters or creatures in the scene, empty scene, ${styleConfig.visualPromptSuffix}`,
        })
      })
    }

    // DEBUG: 최종 앵커 프롬프트 확인
    console.log('[script] anchorPrompts count:', anchorPrompts.length)
    console.log('[script] anchorPrompts:', anchorPrompts.map(a => ({ id: a.id, category: a.category, name: a.name })))

    return {
      sessionId,
      script,
      anchorPrompts,
    }
  }
)
