/**
 * Image Storage Service
 *
 * Handles saving generated images to public folder
 * and returning accessible URLs
 */

import { mkdir, writeFile, unlink, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Storage configuration
const PUBLIC_DIR = join(process.cwd(), 'public')
const GENERATED_DIR = join(PUBLIC_DIR, 'generated')
const GENERATED_URL_PREFIX = '/generated'

// Cleanup configuration
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_FILES = 1000

// ============================================================
// Types
// ============================================================

export interface SaveImageResult {
  success: boolean
  url?: string
  filePath?: string
  error?: string
}

export interface SaveImageParams {
  base64: string
  mimeType?: string
  prefix?: string
  sessionId?: string
}

// ============================================================
// Storage Functions
// ============================================================

/**
 * Ensure generated directory exists
 */
async function ensureGeneratedDir(): Promise<void> {
  if (!existsSync(GENERATED_DIR)) {
    await mkdir(GENERATED_DIR, { recursive: true })
  }
}

/**
 * Get file extension from mime type
 */
function getExtension(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return mimeMap[mimeType] || 'png'
}

/**
 * Generate unique filename
 */
function generateFilename(prefix: string, sessionId: string | undefined, ext: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const session = sessionId ? `${sessionId}-` : ''
  return `${prefix}-${session}${timestamp}-${random}.${ext}`
}

/**
 * Save base64 image to public/generated folder
 */
export async function saveImage(params: SaveImageParams): Promise<SaveImageResult> {
  try {
    await ensureGeneratedDir()

    const {
      base64,
      mimeType = 'image/png',
      prefix = 'img',
      sessionId,
    } = params

    const ext = getExtension(mimeType)
    const filename = generateFilename(prefix, sessionId, ext)
    const filePath = join(GENERATED_DIR, filename)

    // Decode base64 and write file
    const buffer = Buffer.from(base64, 'base64')
    await writeFile(filePath, buffer)

    // Return public URL
    const url = `${GENERATED_URL_PREFIX}/${filename}`

    return {
      success: true,
      url,
      filePath,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save image'
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Save multiple base64 images
 */
export async function saveImages(
  images: Array<SaveImageParams & { id?: string }>
): Promise<Array<SaveImageResult & { id?: string }>> {
  const results = await Promise.all(
    images.map(async (img) => {
      const result = await saveImage(img)
      return { ...result, id: img.id }
    })
  )
  return results
}

/**
 * Delete an image by URL or file path
 */
export async function deleteImage(urlOrPath: string): Promise<boolean> {
  try {
    let filePath = urlOrPath

    // Convert URL to file path
    if (urlOrPath.startsWith(GENERATED_URL_PREFIX)) {
      const filename = urlOrPath.replace(GENERATED_URL_PREFIX + '/', '')
      filePath = join(GENERATED_DIR, filename)
    }

    if (existsSync(filePath)) {
      await unlink(filePath)
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Cleanup old generated images
 */
export async function cleanupOldImages(): Promise<{ deleted: number; errors: number }> {
  let deleted = 0
  let errors = 0

  try {
    if (!existsSync(GENERATED_DIR)) {
      return { deleted, errors }
    }

    const files = await readdir(GENERATED_DIR)
    const now = Date.now()

    // Get file stats and sort by age
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = join(GENERATED_DIR, file)
        try {
          const stats = await stat(filePath)
          return { file, filePath, mtime: stats.mtime.getTime() }
        } catch {
          return null
        }
      })
    )

    const validFiles = fileStats.filter((f): f is NonNullable<typeof f> => f !== null)
    validFiles.sort((a, b) => a.mtime - b.mtime) // oldest first

    for (const { filePath, mtime } of validFiles) {
      const age = now - mtime
      const shouldDelete = age > MAX_AGE_MS || validFiles.length - deleted > MAX_FILES

      if (shouldDelete) {
        try {
          await unlink(filePath)
          deleted++
        } catch {
          errors++
        }
      }
    }
  } catch {
    errors++
  }

  return { deleted, errors }
}

/**
 * Get storage stats
 */
export async function getStorageStats(): Promise<{
  fileCount: number
  totalSizeBytes: number
  oldestFile?: string
  newestFile?: string
}> {
  try {
    if (!existsSync(GENERATED_DIR)) {
      return { fileCount: 0, totalSizeBytes: 0 }
    }

    const files = await readdir(GENERATED_DIR)
    let totalSizeBytes = 0
    let oldestTime = Infinity
    let newestTime = 0
    let oldestFile: string | undefined
    let newestFile: string | undefined

    for (const file of files) {
      try {
        const filePath = join(GENERATED_DIR, file)
        const stats = await stat(filePath)
        totalSizeBytes += stats.size

        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime()
          oldestFile = file
        }
        if (stats.mtime.getTime() > newestTime) {
          newestTime = stats.mtime.getTime()
          newestFile = file
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return {
      fileCount: files.length,
      totalSizeBytes,
      oldestFile,
      newestFile,
    }
  } catch {
    return { fileCount: 0, totalSizeBytes: 0 }
  }
}
