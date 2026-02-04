import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const BUCKET_NAME = 'media-assets'
const LOCAL_GENERATED_DIR = join(process.cwd(), 'public', 'generated')
const LOCAL_URL_PREFIX = '/generated'

interface StorageFile {
  name: string
  id: string
  created_at: string
  metadata?: {
    size?: number
    mimetype?: string
  } | null
}

/**
 * POST /api/library/sync
 *
 * Supabase Storage의 기존 파일들을 media_generations 테이블에 동기화
 */
export async function POST() {
  try {
    const supabase = await createClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 폴더에서 파일 목록 가져오기
    const userPath = `${user.id}`

    // 스캔할 경로들 (userId 폴더 + anonymous 폴더)
    const pathsToScan = [userPath, 'anonymous']

    // image 폴더 스캔 (여러 경로)
    const imageFiles: StorageFile[] = []
    const videoFiles: StorageFile[] = []

    for (const basePath of pathsToScan) {
      // image 폴더
      const { data: images } = await supabase.storage
        .from(BUCKET_NAME)
        .list(`${basePath}/image`, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (images) {
        for (const file of images) {
          if (file.name && !file.name.startsWith('.')) {
            imageFiles.push({
              ...file as StorageFile,
              // 경로 정보 저장
              _basePath: basePath,
            } as StorageFile & { _basePath: string })
          }
        }
      }

      // video 폴더
      const { data: videos } = await supabase.storage
        .from(BUCKET_NAME)
        .list(`${basePath}/video`, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (videos) {
        for (const file of videos) {
          if (file.name && !file.name.startsWith('.')) {
            videoFiles.push({
              ...file as StorageFile,
              _basePath: basePath,
            } as StorageFile & { _basePath: string })
          }
        }
      }
    }

    console.log('[Sync Debug - Supabase]', {
      userId: user.id,
      pathsScanned: pathsToScan,
      imageFiles: imageFiles.length,
      videoFiles: videoFiles.length,
    })

    // 로컬 generated 폴더 스캔
    const localFiles: Array<{ name: string; createdAt: string; size: number; mimeType: string }> = []
    if (existsSync(LOCAL_GENERATED_DIR)) {
      const files = await readdir(LOCAL_GENERATED_DIR)
      for (const filename of files) {
        if (filename.startsWith('.')) continue

        const filePath = join(LOCAL_GENERATED_DIR, filename)
        const fileStat = await stat(filePath)

        // 확장자로 mime type 추정
        const ext = filename.split('.').pop()?.toLowerCase()
        let mimeType = 'image/png'
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
        else if (ext === 'webp') mimeType = 'image/webp'
        else if (ext === 'mp4') mimeType = 'video/mp4'
        else if (ext === 'webm') mimeType = 'video/webm'

        localFiles.push({
          name: filename,
          createdAt: fileStat.birthtime.toISOString(),
          size: fileStat.size,
          mimeType,
        })
      }
    }

    console.log('[Sync Debug - Local]', {
      localDir: LOCAL_GENERATED_DIR,
      localFilesCount: localFiles.length,
    })

    const allFiles: Array<{ file: StorageFile & { _basePath?: string }; mediaType: 'image' | 'video'; path: string }> = []

    for (const file of imageFiles) {
      const basePath = (file as StorageFile & { _basePath?: string })._basePath || userPath
      allFiles.push({
        file: file,
        mediaType: 'image',
        path: `${basePath}/image/${file.name}`,
      })
    }

    for (const file of videoFiles) {
      const basePath = (file as StorageFile & { _basePath?: string })._basePath || userPath
      allFiles.push({
        file: file,
        mediaType: 'video',
        path: `${basePath}/video/${file.name}`,
      })
    }

    // 이미 DB에 있는 URL들 확인
    const { data: existingRecords } = await supabase
      .from('media_generations')
      .select('output_url')
      .eq('user_id', user.id)

    const existingUrls = new Set(existingRecords?.map(r => r.output_url) || [])

    // 새 파일들만 DB에 추가
    let addedCount = 0
    let skippedCount = 0

    // Supabase Storage 파일 동기화
    for (const { file, mediaType, path } of allFiles) {
      // Public URL 생성
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path)

      const publicUrl = urlData.publicUrl

      // 이미 존재하면 스킵
      if (existingUrls.has(publicUrl)) {
        skippedCount++
        continue
      }

      // run_id 생성
      const runId = `sync_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`

      // DB에 추가
      const { error: insertError } = await supabase
        .from('media_generations')
        .insert({
          run_id: runId,
          user_id: user.id,
          media_type: mediaType,
          prompt: `Synced from storage: ${file.name}`,
          output_url: publicUrl,
          provider: 'synced',
          model: 'unknown',
          status: 'completed',
          config: {
            syncedFromStorage: true,
            originalFilename: file.name,
            fileSize: file.metadata?.size,
            mimeType: file.metadata?.mimetype,
          },
          file_size_bytes: file.metadata?.size || null,
          completed_at: file.created_at || new Date().toISOString(),
        })

      if (!insertError) {
        addedCount++
      }
    }

    // 로컬 파일 동기화
    const insertErrors: string[] = []
    for (const localFile of localFiles) {
      const localUrl = `${LOCAL_URL_PREFIX}/${localFile.name}`

      // 이미 존재하면 스킵
      if (existingUrls.has(localUrl)) {
        skippedCount++
        continue
      }

      const mediaType = localFile.mimeType.startsWith('video/') ? 'video' : 'image'

      // run_id 생성
      const runId = `sync_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`

      // DB에 추가
      const { error: insertError } = await supabase
        .from('media_generations')
        .insert({
          run_id: runId,
          user_id: user.id,
          media_type: mediaType,
          prompt: `Synced from local: ${localFile.name}`,
          output_url: localUrl,
          provider: 'synced',
          model: 'unknown',
          status: 'completed',
          config: {
            syncedFromLocal: true,
            originalFilename: localFile.name,
            fileSize: localFile.size,
            mimeType: localFile.mimeType,
          },
          file_size_bytes: localFile.size,
          completed_at: localFile.createdAt,
        })

      if (insertError) {
        insertErrors.push(`${localFile.name}: ${insertError.message}`)
      } else {
        addedCount++
      }
    }

    if (insertErrors.length > 0) {
      console.log('[Sync Debug - Insert Errors]', insertErrors.slice(0, 5))
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${addedCount} files, skipped ${skippedCount} existing`,
      stats: {
        total: allFiles.length + localFiles.length,
        supabaseFiles: allFiles.length,
        localFiles: localFiles.length,
        added: addedCount,
        skipped: skippedCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
