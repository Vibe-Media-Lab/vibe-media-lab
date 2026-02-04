/**
 * fal.ai FFmpeg Client
 *
 * Video composition using fal.ai's FFmpeg API
 * @see https://fal.ai/models/fal-ai/ffmpeg-api/compose
 */

import { fal } from '@fal-ai/client'
import { getLogger } from '@/lib/logger'

const logger = getLogger('fal-client')

// ============================================================
// Types
// ============================================================

export interface FalKeyframe {
  timestamp: number // milliseconds
  duration: number // milliseconds
  url: string
}

export interface FalTrack {
  id: string
  type: 'video' | 'audio'
  keyframes: FalKeyframe[]
}

export interface FalComposeInput {
  tracks: FalTrack[]
}

export interface FalComposeOutput {
  video_url: string
  thumbnail_url: string
}

export class FalError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message)
    this.name = 'FalError'
  }
}

// ============================================================
// Client Configuration
// ============================================================

function configureFal(): void {
  const apiKey = process.env.FAL_KEY
  if (!apiKey) {
    throw new FalError('FAL_KEY is not configured', 401)
  }
  fal.config({ credentials: apiKey })
}

// ============================================================
// Compose API
// ============================================================

/**
 * Compose video from multiple tracks using fal.ai FFmpeg API
 */
export async function composeWithFal(
  input: FalComposeInput
): Promise<FalComposeOutput> {
  configureFal()

  logger.info('Starting fal.ai compose', {
    trackCount: input.tracks.length,
    tracks: input.tracks.map((t) => ({
      id: t.id,
      type: t.type,
      keyframeCount: t.keyframes.length,
    })),
  })

  try {
    const result = await fal.subscribe('fal-ai/ffmpeg-api/compose', {
      input: {
        tracks: input.tracks,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          logger.debug('fal.ai compose in progress', {
            logs: update.logs?.slice(-3),
          })
        }
      },
    })

    const output = result.data as FalComposeOutput

    if (!output.video_url) {
      throw new FalError('Compose completed but no video URL returned')
    }

    logger.info('fal.ai compose completed', {
      videoUrl: output.video_url,
      thumbnailUrl: output.thumbnail_url,
    })

    return output
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Compose failed'
    logger.error('fal.ai compose failed', { error: message })
    throw new FalError(message)
  }
}

// ============================================================
// Utility
// ============================================================

/**
 * Check if fal.ai is configured
 */
export function isFalAvailable(): boolean {
  return !!process.env.FAL_KEY
}

/**
 * Convert seconds to milliseconds for fal.ai API
 */
export function secToMs(seconds: number): number {
  return Math.round(seconds * 1000)
}
