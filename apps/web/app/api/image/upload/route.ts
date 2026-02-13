import { createApiHandler } from '@/lib/api'
import { uploadMedia } from '@/lib/services/supabase-storage'
import { ApiError } from '@vibe-media-lab/shared'

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 14

// Magic bytes for MIME verification
const MAGIC_BYTES: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
}

function verifyMagicBytes(buffer: ArrayBuffer, declaredType: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4))
  const expected = MAGIC_BYTES[declaredType]
  if (!expected) return false
  return expected.every((byte, i) => bytes[i] === byte)
}

interface UploadResponse {
  urls: string[]
}

export const POST = createApiHandler<UploadResponse>(
  async (request, { user }) => {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      throw ApiError.badRequest('파일이 없습니다')
    }
    if (files.length > MAX_FILES) {
      throw ApiError.badRequest(`최대 ${MAX_FILES}개 파일까지 업로드 가능합니다`)
    }

    // Validate all files first and store buffers to avoid double read
    const validatedFiles: Array<{ buffer: ArrayBuffer; file: File }> = []
    for (const file of files) {
      if (!(file instanceof File)) {
        throw ApiError.badRequest('유효하지 않은 파일 형식입니다')
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        throw ApiError.badRequest(`지원하지 않는 파일 형식: ${file.type}`)
      }
      if (file.size > MAX_FILE_SIZE) {
        throw ApiError.badRequest(`파일 크기는 10MB 이하여야 합니다: ${file.name}`)
      }
      // Magic byte verification
      const buffer = await file.arrayBuffer()
      if (!verifyMagicBytes(buffer, file.type)) {
        throw ApiError.badRequest(`파일 내용이 선언된 형식과 일치하지 않습니다: ${file.name}`)
      }
      validatedFiles.push({ buffer, file })
    }

    // Upload all files in parallel (reuse validated buffers)
    const results = await Promise.allSettled(
      validatedFiles.map(async ({ buffer, file }) => {
        const result = await uploadMedia({
          file: Buffer.from(buffer),
          userId: user.id,
          mediaType: 'image',
          filename: file.name,
          contentType: file.type,
        })
        if (!result.success || !result.url) {
          throw new Error(result.error || '업로드 실패')
        }
        return result.url
      }),
    )

    const urls: string[] = []
    const errors: string[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        urls.push(result.value)
      } else {
        errors.push(result.reason?.message || '업로드 실패')
      }
    }

    if (urls.length === 0) {
      throw ApiError.internal(`모든 파일 업로드에 실패했습니다: ${errors.join(', ')}`)
    }

    return { urls }
  },
  { rateLimit: { maxRequests: 20, windowMs: 60_000 } },
)
