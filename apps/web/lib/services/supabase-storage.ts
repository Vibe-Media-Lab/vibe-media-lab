/**
 * Supabase Storage Service
 *
 * Handles media file storage in Supabase Storage
 * Bucket structure: {user_id}/{media_type}/{filename}
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET_NAME = 'media-assets'

/**
 * Create Supabase Admin Client with Service Role Key
 * This bypasses RLS policies for server-side operations
 */
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables (SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface UploadMediaParams {
  file: Buffer | Blob
  userId: string
  mediaType: 'image' | 'video' | 'audio'
  filename?: string
  contentType?: string
}

export interface UploadMediaResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Generate unique filename with timestamp
 */
function generateFilename(originalName?: string, contentType?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)

  if (originalName) {
    const ext = originalName.split('.').pop() || 'bin'
    return `${timestamp}-${random}.${ext}`
  }

  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  }

  const ext = contentType ? extMap[contentType] || 'bin' : 'bin'
  return `${timestamp}-${random}.${ext}`
}

/**
 * Upload media file to Supabase Storage
 * Uses Service Role Key to bypass RLS policies
 */
export async function uploadMedia(
  params: UploadMediaParams
): Promise<UploadMediaResult> {
  try {
    const supabase = createAdminClient()
    const { file, userId, mediaType, filename, contentType } = params

    const generatedFilename = generateFilename(filename, contentType)
    const path = `${userId}/${mediaType}/${generatedFilename}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      return {
        success: false,
        error: uploadError.message,
      }
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    return {
      success: true,
      url: urlData.publicUrl,
      path,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload media'
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Get public URL for a stored file
 */
export async function getPublicUrl(path: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

/**
 * Delete media file from Supabase Storage
 */
export async function deleteMedia(path: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])
    return !error
  } catch {
    return false
  }
}

/**
 * Delete multiple media files
 */
export async function deleteMediaBatch(paths: string[]): Promise<{
  success: number
  failed: number
}> {
  if (paths.length === 0) {
    return { success: 0, failed: 0 }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.storage.from(BUCKET_NAME).remove(paths)

    if (error) {
      return { success: 0, failed: paths.length }
    }

    return { success: paths.length, failed: 0 }
  } catch {
    return { success: 0, failed: paths.length }
  }
}

/**
 * List files in a user's directory
 */
export async function listUserMedia(
  userId: string,
  mediaType?: 'image' | 'video'
): Promise<Array<{ name: string; path: string; size: number }>> {
  try {
    const supabase = await createClient()
    const prefix = mediaType ? `${userId}/${mediaType}` : userId

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error || !data) {
      return []
    }

    return data
      .filter((item) => item.name !== '.emptyFolderPlaceholder')
      .map((item) => ({
        name: item.name,
        path: `${prefix}/${item.name}`,
        size: item.metadata?.size || 0,
      }))
  } catch {
    return []
  }
}
