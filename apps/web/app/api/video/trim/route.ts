import { createApiHandler } from '@/lib/api'
import { trimVideo } from '@/lib/services/video-trim-service'
import { uploadMedia } from '@/lib/services/supabase-storage'
import { z } from 'zod'
import { getLogger } from '@/lib/logger'

const logger = getLogger('api/video/trim')

const TrimRequestSchema = z.object({
  videoUrl: z.string().url(),
  durationSec: z.number().min(1).max(600),
  fadeOutSec: z.number().min(0).max(10).optional().default(2),
})

interface TrimResponse {
  success: boolean
  videoUrl?: string
  durationSec?: number
  error?: string
}

/**
 * POST /api/video/trim
 *
 * Trim video to specified duration with audio fade out
 */
export const POST = createApiHandler<TrimResponse>(
  async (request, { user }) => {
    const body = await request.json()
    const validated = TrimRequestSchema.parse(body)

    const { videoUrl, durationSec, fadeOutSec } = validated

    logger.info('Trim request received', {
      videoUrl: videoUrl.slice(0, 50) + '...',
      durationSec,
      fadeOutSec,
      userId: user.id,
    })

    // Trim video
    const trimResult = await trimVideo({
      videoUrl,
      durationSec,
      fadeOutSec,
    })

    if (!trimResult.success || !trimResult.videoBuffer) {
      logger.error('Trim failed', { error: trimResult.error })
      return {
        success: false,
        error: trimResult.error || 'Video trim failed',
      }
    }

    // Upload trimmed video to Supabase Storage
    const uploadResult = await uploadMedia({
      file: trimResult.videoBuffer,
      userId: user.id,
      mediaType: 'video',
      filename: `trimmed-${Date.now()}.mp4`,
      contentType: 'video/mp4',
    })

    if (!uploadResult.success || !uploadResult.url) {
      logger.error('Upload failed', { error: uploadResult.error })
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload trimmed video',
      }
    }

    logger.info('Trim and upload completed', {
      outputUrl: uploadResult.url.slice(0, 50) + '...',
      durationSec,
    })

    return {
      success: true,
      videoUrl: uploadResult.url,
      durationSec,
    }
  }
)

// Increase max duration for video processing
export const maxDuration = 300
