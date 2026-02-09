import { createApiHandler } from '@/lib/api'
import { uploadMedia } from '@/lib/services/supabase-storage'
import { saveToLibrary } from '@/lib/services/library-saver'
import { getLogger } from '@/lib/logger'

const logger = getLogger('kids-animation/audio/upload')

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * POST /api/kids-animation/audio/upload
 *
 * 수동 오디오 파일 업로드 (외부 TTS/BGM)
 *
 * FormData:
 * - file: 오디오 파일 (audio/*)
 * - type: 'tts' | 'bgm'
 * - sessionId: 세션 ID
 * - shotId: (TTS) 샷 ID
 * - shotNumber: (TTS) 샷 번호
 * - trackIndex: (BGM) 트랙 인덱스
 * - prompt: (선택) 참고 프롬프트
 */
export const POST = createApiHandler(
  async (request, { user }) => {
    const formData = await request.formData()

    const file = formData.get('file')
    const type = formData.get('type')
    const sessionId = formData.get('sessionId')
    const shotId = formData.get('shotId')
    const shotNumber = formData.get('shotNumber')
    const trackIndex = formData.get('trackIndex')
    const prompt = formData.get('prompt')

    if (!(file instanceof File)) {
      return { success: false, error: '오디오 파일이 필요합니다' }
    }

    if (type !== 'tts' && type !== 'bgm') {
      return { success: false, error: "type은 'tts' 또는 'bgm'이어야 합니다" }
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      return { success: false, error: 'sessionId가 필요합니다' }
    }

    // TTS일 때 shotId 필수
    if (type === 'tts' && (!shotId || typeof shotId !== 'string' || shotId.trim() === '')) {
      return { success: false, error: 'TTS 업로드 시 shotId가 필요합니다' }
    }

    // MIME 타입 검증
    if (!file.type.startsWith('audio/')) {
      return { success: false, error: `지원하지 않는 파일 형식: ${file.type}. audio/* 형식만 허용됩니다` }
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `파일 크기 초과: ${Math.round(file.size / 1024 / 1024)}MB. 최대 50MB까지 허용됩니다` }
    }

    logger.info('Manual audio upload received', {
      sessionId,
      type,
      shotId: shotId ? String(shotId) : undefined,
      trackIndex: trackIndex ? String(trackIndex) : undefined,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    })

    // Supabase Storage에 업로드
    const uploadResult = await uploadMedia({
      file,
      userId: user.id,
      mediaType: 'audio',
      filename: file.name,
      contentType: file.type,
    })

    if (!uploadResult.success || !uploadResult.url) {
      logger.error('Audio upload to storage failed', {
        sessionId,
        type,
        error: uploadResult.error,
      })
      return { success: false, error: uploadResult.error || '스토리지 업로드 실패' }
    }

    // 라이브러리에 저장
    await saveToLibrary({
      userId: user.id,
      mediaType: type,
      prompt: typeof prompt === 'string' ? prompt : '',
      outputUrl: uploadResult.url,
      provider: 'manual',
      model: 'manual-upload',
      fileSizeBytes: file.size,
      config: {
        sessionId,
        ...(type === 'tts'
          ? { shotId: String(shotId), shotNumber: Number(shotNumber) || 0 }
          : { trackIndex: Number(trackIndex) || 0 }),
        originalFilename: file.name,
      },
    })

    logger.info('Manual audio upload completed', {
      sessionId,
      type,
      url: uploadResult.url.substring(0, 80),
    })

    return {
      success: true,
      type,
      audioUrl: uploadResult.url,
      ...(type === 'tts'
        ? { shotId: String(shotId), shotNumber: Number(shotNumber) || 0 }
        : { trackIndex: Number(trackIndex) || 0 }),
    }
  },
  { rateLimit: { maxRequests: 20, windowMs: 60_000 } }
)
