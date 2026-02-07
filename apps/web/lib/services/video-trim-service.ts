/**
 * Video Trim Service
 *
 * Trims video to a specific duration using FFmpeg
 * Used to cut final composed video to match expected length
 */

import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { Readable, PassThrough } from 'stream'
import { getLogger } from '@/lib/logger'
import { validateFetchUrl } from '@/lib/security/validate-url'

const logger = getLogger('video-trim-service')

// Set FFmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}

export interface TrimVideoParams {
  videoUrl: string
  durationSec: number
  fadeOutSec?: number // Optional fade out duration for audio
}

export interface TrimVideoResult {
  success: boolean
  videoBuffer?: Buffer
  error?: string
}

/**
 * Download video from URL as a readable stream
 */
async function downloadVideoAsStream(url: string): Promise<Readable> {
  validateFetchUrl(url, { endpoint: 'video-trim-service/downloadVideoAsStream' })
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  // Convert Web ReadableStream to Node.js Readable
  const reader = response.body.getReader()
  const nodeStream = new Readable({
    async read() {
      const { done, value } = await reader.read()
      if (done) {
        this.push(null)
      } else {
        this.push(Buffer.from(value))
      }
    },
  })

  return nodeStream
}

/**
 * Trim video to specified duration with optional audio fade out
 */
export async function trimVideo(
  params: TrimVideoParams
): Promise<TrimVideoResult> {
  const { videoUrl, durationSec, fadeOutSec = 2 } = params

  logger.info('Starting video trim', {
    videoUrl: videoUrl.slice(0, 50) + '...',
    durationSec,
    fadeOutSec,
  })

  try {
    // Download video
    const inputStream = await downloadVideoAsStream(videoUrl)

    // Create output buffer
    const chunks: Buffer[] = []
    const outputStream = new PassThrough()

    outputStream.on('data', (chunk) => {
      chunks.push(chunk)
    })

    // Build FFmpeg command
    const fadeStartSec = Math.max(0, durationSec - fadeOutSec)

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(inputStream)
        .inputFormat('mp4')
        .outputOptions([
          `-t ${durationSec}`, // Trim to duration
          '-c:v copy', // Copy video codec (no re-encoding for speed)
          `-af afade=t=out:st=${fadeStartSec}:d=${fadeOutSec}`, // Audio fade out
          '-movflags frag_keyframe+empty_moov', // Enable streaming output
        ])
        .format('mp4')
        .on('start', (cmd) => {
          logger.debug('FFmpeg command started', { command: cmd })
        })
        .on('progress', (progress) => {
          logger.debug('FFmpeg progress', {
            percent: progress.percent,
            timemark: progress.timemark,
          })
        })
        .on('error', (err) => {
          logger.error('FFmpeg error', { error: err.message })
          reject(err)
        })
        .on('end', () => {
          logger.info('FFmpeg processing completed')
          resolve()
        })

      command.pipe(outputStream, { end: true })
    })

    const videoBuffer = Buffer.concat(chunks)

    logger.info('Video trim completed', {
      outputSize: videoBuffer.length,
      outputSizeMB: (videoBuffer.length / 1024 / 1024).toFixed(2),
    })

    return {
      success: true,
      videoBuffer,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Video trim failed'
    logger.error('Video trim failed', { error: message })

    return {
      success: false,
      error: message,
    }
  }
}
