/**
 * Library Auto-Saver
 *
 * 미디어 생성 시 자동으로 media_generations 테이블에 저장
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Service role client for server-side operations
function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return null
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export type MediaType = 'image' | 'video' | 'tts' | 'bgm'

export interface SaveToLibraryParams {
  userId: string
  mediaType: MediaType
  prompt: string
  outputUrl: string
  provider: string
  model: string
  config?: Record<string, unknown>
  fileSizeBytes?: number
  width?: number
  height?: number
  durationSeconds?: number
  projectId?: string
}

export interface SaveToLibraryResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * 미디어 생성 결과를 Library에 저장
 * userId가 없거나 Supabase가 설정되지 않으면 저장하지 않음
 */
export async function saveToLibrary(params: SaveToLibraryParams): Promise<SaveToLibraryResult> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.warn('[Library Saver] Supabase not configured, skipping save')
    return { success: false, error: 'Supabase not configured' }
  }

  console.log('[Library Saver] Saving to library:', {
    userId: params.userId,
    mediaType: params.mediaType,
    outputUrl: params.outputUrl?.substring(0, 50) + '...',
  })

  const runId = `${params.mediaType}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`

  const { data, error } = await supabase
    .from('media_generations')
    .insert({
      run_id: runId,
      user_id: params.userId,
      media_type: params.mediaType,
      prompt: params.prompt,
      output_url: params.outputUrl,
      provider: params.provider,
      model: params.model,
      status: 'completed',
      config: params.config || {},
      file_size_bytes: params.fileSizeBytes,
      width: params.width,
      height: params.height,
      duration_seconds: params.durationSeconds,
      project_id: params.projectId || null,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Library Saver] Failed to save:', error.message, error)
    return { success: false, error: error.message }
  }

  console.log('[Library Saver] Successfully saved:', runId, 'id:', data?.id)
  return { success: true, id: data?.id }
}
