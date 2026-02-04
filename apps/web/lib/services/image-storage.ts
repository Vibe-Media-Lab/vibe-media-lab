/**
 * Image Storage Service
 *
 * Primary: Supabase Storage (cloud, accessible anywhere)
 * Fallback: Local public/generated folder
 */

import { mkdir, writeFile, unlink, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET_NAME = 'media-assets'

// Local storage configuration (fallback)
const PUBLIC_DIR = join(process.cwd(), 'public')
const GENERATED_DIR = join(PUBLIC_DIR, 'generated')
const GENERATED_URL_PREFIX = '/generated'

// Check if Supabase Storage is available
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY)

// Create Supabase client with service role for storage operations
function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase credentials not configured')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

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
  userId?: string
}

// ============================================================
// Helper Functions
// ============================================================

function getExtension(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  }
  return mimeMap[mimeType] || 'png'
}

function generateFilename(prefix: string, sessionId: string | undefined, ext: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const session = sessionId ? `${sessionId}-` : ''
  return `${prefix}-${session}${timestamp}-${random}.${ext}`
}

async function ensureGeneratedDir(): Promise<void> {
  if (!existsSync(GENERATED_DIR)) {
    await mkdir(GENERATED_DIR, { recursive: true })
  }
}

// ============================================================
// Supabase Storage Functions
// ============================================================

async function saveImageToSupabase(params: SaveImageParams): Promise<SaveImageResult> {
  try {
    const supabase = getSupabaseAdmin()
    const {
      base64,
      mimeType = 'image/png',
      prefix = 'img',
      sessionId,
      userId = 'anonymous',
    } = params

    const ext = getExtension(mimeType)
    const filename = generateFilename(prefix, sessionId, ext)
    const mediaType = mimeType.startsWith('video/') ? 'video' : 'image'
    const path = `${userId}/${mediaType}/${filename}`

    // Decode base64 to buffer
    const buffer = Buffer.from(base64, 'base64')

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    return {
      success: true,
      url: urlData.publicUrl,
      filePath: path,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save to Supabase'
    return {
      success: false,
      error: message,
    }
  }
}

// ============================================================
// Local Storage Functions (Fallback)
// ============================================================

async function saveImageLocally(params: SaveImageParams): Promise<SaveImageResult> {
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

// ============================================================
// Public API
// ============================================================

/**
 * Save base64 image - uses Supabase Storage if available, local fallback otherwise
 */
export async function saveImage(params: SaveImageParams): Promise<SaveImageResult> {
  if (USE_SUPABASE) {
    const result = await saveImageToSupabase(params)
    if (result.success) {
      return result
    }
    // Fallback to local on Supabase failure
    console.warn('Supabase upload failed, falling back to local:', result.error)
  }

  return saveImageLocally(params)
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
  // Check if it's a Supabase URL
  if (SUPABASE_URL && urlOrPath.includes(SUPABASE_URL)) {
    try {
      const supabase = getSupabaseAdmin()
      // Extract path from URL
      const urlObj = new URL(urlOrPath)
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/media-assets\/(.+)/)
      if (pathMatch && pathMatch[1]) {
        const { error } = await supabase.storage.from(BUCKET_NAME).remove([pathMatch[1]])
        return !error
      }
    } catch {
      return false
    }
  }

  // Local file deletion
  try {
    let filePath = urlOrPath

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
 * Get storage stats (local only)
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

/**
 * Check which storage is being used
 */
export function getStorageProvider(): 'supabase' | 'local' {
  return USE_SUPABASE ? 'supabase' : 'local'
}
