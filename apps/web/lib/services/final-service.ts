/**
 * Final Video Composition Service
 *
 * Composes individual video clips + TTS + BGM into a final video
 * Primary: fal.ai FFmpeg API
 * Fallback: Mock (returns placeholder)
 *
 * @see https://fal.ai/models/fal-ai/ffmpeg-api/compose
 */

import {
  composeWithFal,
  isFalAvailable,
  secToMs,
  FalError,
  type FalComposeInput,
  type FalTrack,
  type FalKeyframe,
} from './fal-client'
import { generateImage, editImage } from './image-service'
import { saveToLibrary } from './library-saver'
import { getLogger } from '@/lib/logger'
import type {
  ComposeVideoParams,
  ComposeVideoResult,
  ThumbnailGenerateParams,
  ThumbnailGenerateResult,
} from './types'

const logger = getLogger('final-service')

// Provider detection
const USE_FAL = isFalAvailable()
const IS_MOCK = !USE_FAL

logger.info('Final service initialized', {
  provider: USE_FAL ? 'fal' : 'mock',
})

// ============================================================
// Video Composition
// ============================================================

/**
 * Compose multiple video clips with TTS and BGM into a final video
 */
export async function composeVideo(
  params: ComposeVideoParams
): Promise<ComposeVideoResult> {
  let result: ComposeVideoResult

  if (IS_MOCK) {
    result = await mockComposeVideo(params)
  } else {
    result = await composeVideoWithFal(params)
  }

  // Auto-save to library if userId is provided
  if (result.success && result.videoUrl && params.userId) {
    const saveResult = await saveToLibrary({
      userId: params.userId,
      projectId: params.projectId,
      mediaType: 'video',
      prompt: `Composed video with ${params.shots.length} shots`,
      outputUrl: result.videoUrl,
      provider: getFinalServiceProvider(),
      model: 'fal-ffmpeg',
      config: {
        sessionId: params.sessionId,
        shotCount: params.shots.length,
        duration: result.duration,
        ...params.metadata,
      },
    })

    if (saveResult.success && saveResult.id) {
      logger.debug('Saved composed video to library', { dbId: saveResult.id })
    }
  }

  return result
}

/**
 * Build fal.ai compose input from shots and BGM
 * Uses immutable pattern to calculate timeline positions
 */
function buildFalComposeInput(params: ComposeVideoParams): {
  input: FalComposeInput
  totalDurationMs: number
} {
  // Calculate timeline positions using immutable reduce pattern
  const { videoKeyframes, ttsKeyframes, totalDurationMs } = params.shots.reduce(
    (acc, shot) => {
      const durationMs = secToMs(shot.duration)

      const videoKeyframe: FalKeyframe = {
        timestamp: acc.currentTimeMs,
        duration: durationMs,
        url: shot.videoUrl,
      }

      const ttsKeyframe: FalKeyframe = {
        timestamp: acc.currentTimeMs,
        duration: durationMs,
        url: shot.audioUrl,
      }

      return {
        videoKeyframes: [...acc.videoKeyframes, videoKeyframe],
        ttsKeyframes: [...acc.ttsKeyframes, ttsKeyframe],
        currentTimeMs: acc.currentTimeMs + durationMs,
        totalDurationMs: acc.currentTimeMs + durationMs,
      }
    },
    {
      videoKeyframes: [] as FalKeyframe[],
      ttsKeyframes: [] as FalKeyframe[],
      currentTimeMs: 0,
      totalDurationMs: 0,
    }
  )

  // Build tracks
  const tracks: FalTrack[] = [
    // Track 1: Video clips
    {
      id: 'video_track',
      type: 'video',
      keyframes: videoKeyframes,
    },
    // Track 2: TTS narration
    {
      id: 'tts_track',
      type: 'audio',
      keyframes: ttsKeyframes,
    },
    // Track 3: Background music
    {
      id: 'bgm_track',
      type: 'audio',
      keyframes: [
        {
          timestamp: 0,
          duration: totalDurationMs,
          url: params.bgmUrl,
        },
      ],
    },
  ]

  return {
    input: { tracks },
    totalDurationMs,
  }
}

async function composeVideoWithFal(
  params: ComposeVideoParams
): Promise<ComposeVideoResult> {
  try {
    logger.info('Starting video composition with fal.ai', {
      shotCount: params.shots.length,
      bgmUrl: params.bgmUrl ? params.bgmUrl.slice(0, 50) + '...' : 'EMPTY',
    })

    const { input, totalDurationMs } = buildFalComposeInput(params)

    logger.debug('fal.ai compose input built', {
      trackCount: input.tracks.length,
      totalDurationMs,
      tracks: input.tracks.map((t) => ({
        id: t.id,
        type: t.type,
        keyframeCount: t.keyframes.length,
        firstKeyframe: t.keyframes[0],
      })),
    })

    // Submit compose job and wait for completion
    const result = await composeWithFal(input)

    const totalDurationSec = totalDurationMs / 1000

    logger.info('Video composition completed', {
      videoUrl: result.video_url,
      thumbnailUrl: result.thumbnail_url,
      duration: totalDurationSec,
    })

    return {
      success: true,
      videoUrl: result.video_url,
      duration: totalDurationSec,
      renderId: `fal-${Date.now()}`,
    }
  } catch (error) {
    const message =
      error instanceof FalError ? error.message : 'Video composition failed'

    logger.error('Video composition failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      error: message,
    }
  }
}

// Mock configuration constants
const MOCK_PER_SHOT_DELAY_MS = 500
const MOCK_MAX_DELAY_MS = 3000

async function mockComposeVideo(
  params: ComposeVideoParams
): Promise<ComposeVideoResult> {
  logger.debug('Using mock compose video')

  // Simulate processing time based on shot count
  const processTimeMs = Math.min(
    params.shots.length * MOCK_PER_SHOT_DELAY_MS,
    MOCK_MAX_DELAY_MS
  )
  await new Promise((resolve) => setTimeout(resolve, processTimeMs))

  const totalDuration = params.shots.reduce(
    (sum, shot) => sum + shot.duration,
    0
  )

  // Return mock URL (actual video won't play, but endpoint works)
  return {
    success: true,
    videoUrl: `https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
    duration: totalDuration,
    renderId: `mock-${Date.now()}`,
  }
}

// ============================================================
// Thumbnail Generation
// ============================================================

/**
 * Generate a thumbnail image for the video
 * Uses nanobanana (Gemini/Kieai) to create a stylized thumbnail
 */
export async function generateThumbnail(
  params: ThumbnailGenerateParams
): Promise<ThumbnailGenerateResult> {
  try {
    const prompt = buildThumbnailPrompt(params)
    const hasReferences = params.referenceUrls && params.referenceUrls.length > 0

    logger.debug('Generating thumbnail', {
      title: params.title,
      style: params.style,
      hasReferences,
      referenceCount: params.referenceUrls?.length ?? 0,
    })

    const baseOpts = {
      aspectRatio: '16:9' as const,
      resolution: '2K' as const,
      userId: params.userId,
      sessionId: params.sessionId,
      metadata: {
        type: 'thumbnail',
        ...params.metadata,
      },
    }

    const result = hasReferences
      ? await editImage({
          ...baseOpts,
          prompt,
          referenceUrls: params.referenceUrls!,
        })
      : await generateImage({
          ...baseOpts,
          prompt,
        })

    if (!result.success || !result.url) {
      return {
        success: false,
        error: result.error || 'Thumbnail generation failed',
      }
    }

    return {
      success: true,
      url: result.url,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Thumbnail generation failed'
    logger.error('Thumbnail generation failed', { error: message })

    return {
      success: false,
      error: message,
    }
  }
}

function buildThumbnailPrompt(params: {
  title: string
  style: string
  logline?: string
  characters?: Array<{ name: string; visualDescription: string }>
}): string {
  const styleDescriptions: Record<string, string> = {
    pixar:
      'Pixar 3D animation style, vibrant colors, expressive characters, cinematic lighting',
    disney:
      'Disney classic animation style, warm colors, magical atmosphere, fairy tale aesthetic',
    dreamworks:
      'DreamWorks animation style, dynamic poses, bold colors, energetic composition',
  }

  const styleDesc = styleDescriptions[params.style] || styleDescriptions['pixar']

  let prompt = `YouTube video thumbnail for kids animation titled "${params.title}". ${styleDesc}. `

  if (params.logline) {
    prompt += `Story: ${params.logline}. `
  }

  if (params.characters && params.characters.length > 0) {
    const charDescriptions = params.characters
      .map(c => `${c.name} (${c.visualDescription})`)
      .join(', ')
    prompt += `Featured characters: ${charDescriptions}. `
  }

  prompt +=
    'Eye-catching composition, bright and cheerful colors, suitable for children. '
  prompt += 'High quality, professional looking thumbnail.'

  return prompt
}

// ============================================================
// Utility
// ============================================================

export function isFinalServiceAvailable(): boolean {
  return !IS_MOCK
}

export function getFinalServiceProvider(): 'fal' | 'mock' {
  return USE_FAL ? 'fal' : 'mock'
}

/**
 * Estimate composition time based on total video duration
 * Returns estimated time in seconds
 */
export function estimateCompositionTime(totalDurationSec: number): number {
  // fal.ai FFmpeg typically processes at ~10x realtime
  // Add buffer for queue time
  const processingMultiplier = 2
  const queueBuffer = 15 // 15 seconds queue buffer

  return Math.ceil(totalDurationSec * processingMultiplier + queueBuffer)
}
