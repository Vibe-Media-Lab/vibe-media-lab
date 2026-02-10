/**
 * Gemini Image Client
 *
 * Direct API client for Gemini 3 Pro Image Preview
 * Handles text-to-image and reference-based image editing
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import { getLogger } from '@/lib/logger'
import { validateFetchUrl } from '@/lib/security/validate-url'

const logger = getLogger('gemini-image-client')

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`

// ============================================================
// Types
// ============================================================

export type GeminiAspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9'

export type GeminiImageSize = '1K' | '2K' | '4K'

export interface GeminiImageGenerateParams {
  prompt: string
  aspectRatio?: GeminiAspectRatio
  imageSize?: GeminiImageSize
}

export interface GeminiImageEditParams {
  prompt: string
  referenceImages: Array<{
    base64: string
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  }>
  aspectRatio?: GeminiAspectRatio
  imageSize?: GeminiImageSize
}

export interface GeminiImageResult {
  success: boolean
  base64?: string
  mimeType?: string
  text?: string
  error?: string
}

export class GeminiImageError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'GeminiImageError'
  }
}

// ============================================================
// API Client
// ============================================================

function getApiKey(): string {
  if (!GEMINI_API_KEY) {
    throw new GeminiImageError('GEMINI_API_KEY is not configured')
  }
  return GEMINI_API_KEY
}

interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
}

interface GeminiContent {
  parts: GeminiPart[]
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[]
    }
    finishReason?: string
  }>
  error?: {
    code: number
    message: string
    status: string
  }
}

async function callGeminiImage(
  contents: GeminiContent[],
  config: {
    aspectRatio?: GeminiAspectRatio
    imageSize?: GeminiImageSize
  } = {}
): Promise<GeminiImageResult> {
  const apiKey = getApiKey()

  const requestBody = {
    contents,
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      // Image parameters go inside imageConfig
      ...((config.aspectRatio || config.imageSize) && {
        imageConfig: {
          ...(config.aspectRatio && { aspectRatio: config.aspectRatio }),
          ...(config.imageSize && { imageSize: config.imageSize }),
        },
      }),
    },
  }

  logger.debug('Calling Gemini Image API', {
    hasAspectRatio: !!config.aspectRatio,
    hasImageSize: !!config.imageSize,
  })

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error('Gemini Image API error', {
      status: response.status,
      statusText: response.statusText,
    })
    throw new GeminiImageError(
      `Gemini API error: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    )
  }

  const data: GeminiResponse = await response.json()

  if (data.error) {
    throw new GeminiImageError(
      data.error.message,
      data.error.code,
      data.error
    )
  }

  const candidate = data.candidates?.[0]
  if (!candidate?.content?.parts) {
    const finishReason = candidate?.finishReason || 'UNKNOWN'
    logger.error('Gemini returned no image content', {
      finishReason,
      hasCandidates: !!data.candidates?.length,
      hasContent: !!candidate?.content,
    })
    throw new GeminiImageError(
      `No response from Gemini (finishReason: ${finishReason})`,
      undefined,
      { finishReason }
    )
  }

  // Extract image and text from response
  let base64: string | undefined
  let mimeType: string | undefined
  let text: string | undefined

  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      base64 = part.inlineData.data
      mimeType = part.inlineData.mimeType
    }
    if (part.text) {
      text = part.text
    }
  }

  if (!base64) {
    throw new GeminiImageError('No image in response')
  }

  return {
    success: true,
    base64,
    mimeType: mimeType || 'image/png',
    text,
  }
}

// ============================================================
// Public Functions
// ============================================================

/**
 * Generate image from text prompt
 */
export async function generateImageFromText(
  params: GeminiImageGenerateParams
): Promise<GeminiImageResult> {
  const contents: GeminiContent[] = [
    {
      parts: [{ text: params.prompt }],
    },
  ]

  return callGeminiImage(contents, {
    aspectRatio: params.aspectRatio,
    imageSize: params.imageSize,
  })
}

/**
 * Generate image from reference images + prompt
 * Supports up to 14 reference images (6 objects + 5 humans recommended)
 */
export async function generateImageFromReference(
  params: GeminiImageEditParams
): Promise<GeminiImageResult> {
  if (params.referenceImages.length === 0) {
    throw new GeminiImageError('At least one reference image is required')
  }

  if (params.referenceImages.length > 14) {
    throw new GeminiImageError('Maximum 14 reference images allowed')
  }

  // Build parts array with reference images first, then prompt
  const parts: GeminiPart[] = []

  // Add reference images
  for (const ref of params.referenceImages) {
    parts.push({
      inlineData: {
        mimeType: ref.mimeType,
        data: ref.base64,
      },
    })
  }

  // Add text prompt
  parts.push({ text: params.prompt })

  const contents: GeminiContent[] = [{ parts }]

  return callGeminiImage(contents, {
    aspectRatio: params.aspectRatio,
    imageSize: params.imageSize,
  })
}

// ============================================================
// Utility
// ============================================================

/**
 * Check if Gemini Image API is available
 */
export function isGeminiImageAvailable(): boolean {
  return !!GEMINI_API_KEY
}

/**
 * Convert URL to base64 (for reference images)
 *
 * Supports:
 * - Local files: /generated/xxx.jpg (reads from public folder)
 * - Remote URLs: https://example.com/image.jpg
 */
export async function urlToBase64(
  url: string
): Promise<{ base64: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp' }> {
  // Handle local files from /generated/ folder
  if (url.startsWith('/generated/')) {
    const fs = await import('fs/promises')
    const path = await import('path')

    // Resolve to public/generated/ folder
    const filePath = path.join(process.cwd(), 'public', url)

    try {
      const buffer = await fs.readFile(filePath)
      const base64 = buffer.toString('base64')

      // Determine MIME type from extension
      let mimeType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png'
      if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
        mimeType = 'image/jpeg'
      } else if (url.endsWith('.webp')) {
        mimeType = 'image/webp'
      }

      logger.debug('Read local file', { path: filePath, size: buffer.length })
      return { base64, mimeType }
    } catch {
      throw new GeminiImageError(`Failed to read local image: ${filePath}`)
    }
  }

  // Handle remote URLs — SSRF 방어
  validateFetchUrl(url, { endpoint: 'gemini-image-client/urlToBase64' })
  const response = await fetch(url)

  if (!response.ok) {
    throw new GeminiImageError(`Failed to fetch image: ${url}`)
  }

  const contentType = response.headers.get('content-type') || 'image/png'
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  let mimeType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    mimeType = 'image/jpeg'
  } else if (contentType.includes('webp')) {
    mimeType = 'image/webp'
  }

  return { base64, mimeType }
}

/**
 * Convert multiple URLs to base64
 */
export async function urlsToBase64(
  urls: string[]
): Promise<Array<{ base64: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp' }>> {
  return Promise.all(urls.map(urlToBase64))
}
