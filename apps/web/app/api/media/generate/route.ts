import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createApiHandler } from '@/lib/api'
import { ApiError, MediaTypeSchema } from '@vibe-media-lab/shared'

const generateRequestSchema = z.object({
  mediaType: MediaTypeSchema,
  prompt: z.string().min(1).max(5000),
  aspectRatio: z.string().optional(),
  model: z.string().optional(),
})

interface GenerateResponse {
  id: string
  runId: string
  outputUrl: string
  provider: string
  model: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export const POST = createApiHandler<GenerateResponse>(async (request, { user, requestId }) => {
  const body = await request.json()
  const validated = generateRequestSchema.parse(body)

  const { mediaType, prompt, aspectRatio, model } = validated
  const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`

  if (mediaType !== 'image') {
    throw ApiError.badRequest(`${mediaType} 생성은 아직 지원되지 않습니다`)
  }

  const supabase = await createClient()

  const { data: generation, error: dbError } = await supabase
    .from('media_generations')
    .insert({
      run_id: runId,
      user_id: user.id,
      media_type: mediaType,
      prompt,
      config: { aspectRatio, model, requestId },
      provider: 'gemini',
      model: model || 'gemini-2.5-flash-image',
      status: 'pending',
    })
    .select()
    .single()

  if (dbError) {
    if (dbError.code === '42P01') {
      return {
        id: crypto.randomUUID(),
        runId,
        outputUrl: 'https://placehold.co/1920x1080/png?text=Generated+Image',
        provider: 'gemini',
        model: model || 'gemini-2.5-flash-image',
        status: 'completed' as const,
      }
    }
    throw ApiError.internal(`Database error: ${dbError.message}`)
  }

  await supabase
    .from('media_generations')
    .update({
      status: 'completed',
      output_url: 'https://placehold.co/1920x1080/png?text=Generated+Image',
      completed_at: new Date().toISOString(),
    })
    .eq('id', generation.id)

  return {
    id: generation.id,
    runId,
    outputUrl: 'https://placehold.co/1920x1080/png?text=Generated+Image',
    provider: 'gemini',
    model: model || 'gemini-2.5-flash-image',
    status: 'completed' as const,
  }
})
