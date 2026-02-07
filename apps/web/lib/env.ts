/**
 * Environment Variable Validation
 *
 * Zod 스키마로 환경변수를 빌드/런타임에 검증하고 타입 안전한 접근을 제공
 */

import { z } from 'zod'

const serverSchema = z.object({
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // AI Providers (optional — mock 모드 허용)
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // External Services
  KIEAI_API_KEY: z.string().optional(),
  FAL_KEY: z.string().optional(),

  // Runtime
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
})

export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>

function validateServerEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Server environment validation failed:', result.error.flatten().fieldErrors)
    throw new Error(`Invalid server environment variables: ${result.error.message}`)
  }
  return result.data
}

function validateClientEnv(): ClientEnv {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  if (!result.success) {
    console.error('Client environment validation failed:', result.error.flatten().fieldErrors)
    throw new Error(`Invalid client environment variables: ${result.error.message}`)
  }
  return result.data
}

/** 타입 안전한 서버 환경변수 접근 */
export const serverEnv = validateServerEnv()

/** 타입 안전한 클라이언트 환경변수 접근 */
export const clientEnv = validateClientEnv()
