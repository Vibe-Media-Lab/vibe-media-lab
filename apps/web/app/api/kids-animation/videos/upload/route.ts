import { createApiHandler } from '@/lib/api'
import { uploadMedia } from '@/lib/services/supabase-storage'
import { saveToLibrary } from '@/lib/services/library-saver'
import { getLogger } from '@/lib/logger'

const logger = getLogger('kids-animation/videos/upload')

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * POST /api/kids-animation/videos/upload
 *
 * 수동 비디오 파일 업로드 (Hailuo 등 외부 생성 비디오)
 *
 * FormData:
 * - file: 비디오 파일 (video/*)
 * - shotId: 샷 ID
 * - shotNumber: 샷 번호
 * - sessionId: 세션 ID
 * - prompt: (선택) 비디오 생성에 사용된 프롬프트
 */
export const POST = createApiHandler(
  async (request, { user }) => {
    const formData = await request.formData()

    const file = formData.get('file')
    const shotId = formData.get('shotId')
    const shotNumber = formData.get('shotNumber')
    const sessionId = formData.get('sessionId')
    const prompt = formData.get('prompt')

    if (!(file instanceof File)) {
      return { success: false, error: '비디오 파일이 필요합니다' }
    }

    if (!shotId || typeof shotId !== 'string' || shotId.trim() === '') {
      return { success: false, error: 'shotId가 필요합니다' }
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      return { success: false, error: 'sessionId가 필요합니다' }
    }

    // MIME 타입 검증
    if (!file.type.startsWith('video/')) {
      return { success: false, error: `지원하지 않는 파일 형식: ${file.type}. video/* 형식만 허용됩니다` }
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `파일 크기 초과: ${Math.round(file.size / 1024 / 1024)}MB. 최대 100MB까지 허용됩니다` }
    }

    logger.info('Manual video upload received', {
      sessionId,
      shotId,
      shotNumber: String(shotNumber),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    })

    // Supabase Storage에 업로드
    const uploadResult = await uploadMedia({
      file,
      userId: user.id,
      mediaType: 'video',
      filename: file.name,
      contentType: file.type,
    })

    if (!uploadResult.success || !uploadResult.url) {
      logger.error('Video upload to storage failed', {
        sessionId,
        shotId,
        error: uploadResult.error,
      })
      return { success: false, error: uploadResult.error || '스토리지 업로드 실패' }
    }

    // 라이브러리에 저장
    await saveToLibrary({
      userId: user.id,
      mediaType: 'video',
      prompt: typeof prompt === 'string' ? prompt : '',
      outputUrl: uploadResult.url,
      provider: 'hailuo-manual',
      model: 'manual-upload',
      fileSizeBytes: file.size,
      config: {
        sessionId,
        shotId,
        shotNumber: Number(shotNumber) || 0,
        originalFilename: file.name,
      },
    })

    logger.info('Manual video upload completed', {
      sessionId,
      shotId,
      url: uploadResult.url.substring(0, 80),
    })

    return {
      success: true,
      shotId,
      shotNumber: Number(shotNumber) || 0,
      videoUrl: uploadResult.url,
    }
  },
  { rateLimit: { maxRequests: 20, windowMs: 60_000 } }
)
