/**
 * BGM Processor Service
 *
 * Processes BGM to fit target duration:
 * - Takes beginning portion
 * - Crossfades with ending portion
 * - Creates musically coherent audio of exact target length
 */

import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { Readable, PassThrough } from 'stream'
import { getLogger } from '@/lib/logger'

const logger = getLogger('bgm-processor')

// Set FFmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}

export interface ProcessBGMParams {
  bgmUrl: string
  targetDurationSec: number
  fadeOutSec?: number // Fade out at the end
  crossfadeSec?: number // Crossfade duration between beginning and ending
  volume?: number // Volume level (0.0 to 1.0, default 0.3 = 30%)
}

export interface ProcessBGMResult {
  success: boolean
  audioBuffer?: Buffer
  error?: string
}

const DOWNLOAD_MAX_RETRIES = 3
const DOWNLOAD_RETRY_DELAY_MS = 1000

/**
 * Download audio from URL as buffer (with retry)
 */
async function downloadAudio(url: string): Promise<Buffer> {
  logger.debug('Downloading audio', { url: url.slice(0, 80) })

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= DOWNLOAD_MAX_RETRIES; attempt++) {
    try {
      const buffer = await downloadAudioOnce(url)
      if (attempt > 1) {
        logger.info('Audio download succeeded after retry', { attempt })
      }
      return buffer
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Download failed')
      logger.warn('Audio download attempt failed', {
        attempt,
        maxRetries: DOWNLOAD_MAX_RETRIES,
        error: lastError.message,
      })

      if (attempt < DOWNLOAD_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_RETRY_DELAY_MS * attempt))
      }
    }
  }

  throw lastError || new Error('Audio download failed after all retries')
}

async function downloadAudioOnce(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'audio/mpeg, audio/mp3, audio/*;q=0.9, */*;q=0.8',
      'Accept-Encoding': 'identity', // Disable compression for audio
      'Connection': 'keep-alive',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type')
  const contentLength = response.headers.get('content-length')

  logger.debug('Audio response headers', {
    contentType,
    contentLength,
    status: response.status,
  })

  // Stream-based reading for better reliability
  const chunks: Uint8Array[] = []
  const reader = response.body?.getReader()

  if (!reader) {
    throw new Error('Response body is not readable')
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
      }
    }
  } finally {
    reader.releaseLock()
  }

  // Combine chunks into a single buffer
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const buffer = Buffer.alloc(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }

  if (buffer.length === 0) {
    throw new Error('Downloaded audio is empty')
  }

  logger.debug('Audio downloaded successfully', {
    size: buffer.length,
    sizeKB: Math.round(buffer.length / 1024),
    chunkCount: chunks.length,
  })

  return buffer
}

/**
 * Get audio duration using FFmpeg (from URL directly)
 */
async function getAudioDurationFromUrl(url: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(url, (err, data) => {
      if (err) {
        logger.warn('ffprobe from URL failed', { error: err.message })
        // URL 접근 실패 시 기본값 반환 (3분)
        resolve(180)
        return
      }
      const rawDuration = data.format.duration
      // duration이 숫자가 아니면 기본값 사용 (3분)
      const duration = typeof rawDuration === 'number' && !isNaN(rawDuration) ? rawDuration : 180
      logger.debug('Got duration from URL', { rawDuration, duration })
      resolve(duration)
    })
  })
}

/**
 * Process BGM to fit target duration
 *
 * Strategy:
 * 1. If BGM is shorter than target: loop it
 * 2. If BGM is longer than target:
 *    - Simply trim to target duration (use beginning portion)
 *    - Add fade out at the very end
 */
export async function processBGM(
  params: ProcessBGMParams
): Promise<ProcessBGMResult> {
  const {
    bgmUrl,
    targetDurationSec,
    fadeOutSec = 2,
    volume = 0.3, // Default 30% volume to not overpower narration
  } = params

  logger.info('Starting BGM processing', {
    bgmUrl: bgmUrl.slice(0, 50) + '...',
    targetDurationSec,
    fadeOutSec,
    volume,
  })

  try {
    // Get original duration from URL first (before downloading)
    const originalDuration = await getAudioDurationFromUrl(bgmUrl)
    logger.info('Original BGM duration', { originalDuration })

    // Download BGM
    const inputBuffer = await downloadAudio(bgmUrl)
    logger.debug('BGM downloaded', { size: inputBuffer.length })

    // If BGM is already shorter or equal to target, loop it
    if (originalDuration <= targetDurationSec) {
      logger.info('BGM is shorter than target, using loop processing')
      return await simpleProcess(inputBuffer, targetDurationSec, fadeOutSec, volume)
    }

    // BGM is longer than target - just trim to target duration
    logger.info('BGM is longer than target, trimming to fit')
    return await trimProcess(inputBuffer, targetDurationSec, fadeOutSec, volume)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'BGM processing failed'
    logger.error('BGM processing failed', { error: message })

    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Simple processing for short BGM (loop or pad)
 */
async function simpleProcess(
  inputBuffer: Buffer,
  targetDurationSec: number,
  fadeOutSec: number,
  volume: number
): Promise<ProcessBGMResult> {
  return new Promise((resolve) => {
    const inputStream = new Readable()
    inputStream.push(inputBuffer)
    inputStream.push(null)

    const chunks: Buffer[] = []
    const outputStream = new PassThrough()

    outputStream.on('data', (chunk) => chunks.push(chunk))

    const fadeStart = Math.max(0, targetDurationSec - fadeOutSec)

    // Audio filter chain: loop -> trim -> volume -> fadeout
    const audioFilter = `aloop=loop=-1:size=2e+09,atrim=0:${targetDurationSec},volume=${volume},afade=t=out:st=${fadeStart}:d=${fadeOutSec}`

    ffmpeg(inputStream)
      .inputFormat('mp3')
      .outputOptions([
        `-t ${targetDurationSec}`,
        `-af ${audioFilter}`,
      ])
      .format('mp3')
      .on('error', (err) => {
        logger.error('Simple process error', { error: err.message })
        resolve({ success: false, error: err.message })
      })
      .on('end', () => {
        const audioBuffer = Buffer.concat(chunks)
        logger.info('Simple processing completed', { size: audioBuffer.length })
        resolve({ success: true, audioBuffer })
      })
      .pipe(outputStream, { end: true })
  })
}

/**
 * Trim processing for long BGM
 * Simply takes the beginning portion, adjusts volume, and adds fade out
 */
async function trimProcess(
  inputBuffer: Buffer,
  targetDurationSec: number,
  fadeOutSec: number,
  volume: number
): Promise<ProcessBGMResult> {
  return new Promise((resolve) => {
    const fadeStart = Math.max(0, targetDurationSec - fadeOutSec)

    logger.debug('Trim parameters', {
      targetDurationSec,
      fadeStart,
      fadeOutSec,
      volume,
    })

    // Create input stream
    const inputStream = new Readable()
    inputStream.push(inputBuffer)
    inputStream.push(null)

    const chunks: Buffer[] = []
    const outputStream = new PassThrough()

    outputStream.on('data', (chunk) => chunks.push(chunk))

    // Audio filter chain: trim -> volume -> fadeout
    const audioFilter = `atrim=0:${targetDurationSec},volume=${volume},afade=t=out:st=${fadeStart}:d=${fadeOutSec}`

    // Simple trim: take first targetDurationSec, reduce volume, and add fade out
    ffmpeg(inputStream)
      .inputFormat('mp3')
      .outputOptions([
        `-t ${targetDurationSec}`,
        `-af ${audioFilter}`,
      ])
      .format('mp3')
      .on('start', (cmd) => {
        logger.debug('FFmpeg trim command', { command: cmd })
      })
      .on('error', (err) => {
        logger.error('Trim process error', { error: err.message })
        resolve({ success: false, error: err.message })
      })
      .on('end', () => {
        const audioBuffer = Buffer.concat(chunks)
        logger.info('Trim processing completed', { size: audioBuffer.length })
        resolve({ success: true, audioBuffer })
      })
      .pipe(outputStream, { end: true })
  })
}
