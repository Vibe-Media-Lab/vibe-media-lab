/**
 * Gemini Client
 *
 * 범용 Gemini API 클라이언트 (llm-service.ts에서 추출)
 * JSON 모드 + Text 모드 지원
 *
 * @see https://ai.google.dev/gemini-api/docs
 */

import { getLogger } from '@/lib/logger'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'
import { retryWithBackoff } from '@/lib/utils/retry-with-backoff'

const logger = getLogger('gemini-client')

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not configured')
  return key
}

export interface GeminiClientOptions {
  systemPrompt?: string
  temperature?: number
  maxOutputTokens?: number
  timeoutMs?: number
  model?: string
  mode?: 'json' | 'text'
}

function getApiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

/**
 * 내부 핵심 호출 함수
 * mode에 따라 responseMimeType 결정:
 *   mode='json' → responseMimeType: 'application/json'
 *   mode='text' → responseMimeType 생략 (plain text)
 */
async function callGeminiRaw(prompt: string, options?: GeminiClientOptions): Promise<string> {
  const apiKey = getApiKey()

  const model = options?.model ?? 'gemini-2.5-flash'
  const temperature = options?.temperature ?? 0.7
  const maxOutputTokens = options?.maxOutputTokens ?? 16384
  const timeoutMs = options?.timeoutMs ?? 90000
  const mode = options?.mode ?? 'json'

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens,
  }

  if (mode === 'json') {
    generationConfig.responseMimeType = 'application/json'
  }

  const contents = [{ parts: [{ text: prompt }] }]

  const body: Record<string, unknown> = {
    contents,
    generationConfig,
  }

  if (options?.systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    }
  }

  const apiUrl = getApiUrl(model)

  return retryWithBackoff(
    async () => {
      const response = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        logger.error('Gemini API request failed', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorBody.slice(0, 500),
        })
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        logger.error('No text in Gemini response', {
          hasCandidate: !!data.candidates?.[0],
          hasContent: !!data.candidates?.[0]?.content,
        })
        throw new Error('No response from Gemini')
      }

      return text
    },
    {
      maxRetries: 2,
      onRetry: (error, attempt, delayMs) => {
        logger.warn('Gemini API retry', {
          attempt,
          delayMs,
          model,
          mode,
          error: error instanceof Error ? error.message : String(error),
        })
      },
    }
  )
}

/**
 * Gemini JSON 모드 호출 + extractJSON 파싱
 *
 * responseMimeType: 'application/json' 강제 → extractJSON<T>로 파싱
 * 기존 llm-service의 callGemini + extractJSON 1:1 대체
 */
export async function callGeminiJSON<T>(prompt: string, options?: Omit<GeminiClientOptions, 'mode'>): Promise<T> {
  const text = await callGeminiRaw(prompt, { ...options, mode: 'json' })
  return extractJSON<T>(text)
}

/**
 * Gemini Text 모드 호출
 *
 * responseMimeType 미설정 → plain text 응답
 */
export async function callGeminiText(prompt: string, options?: Omit<GeminiClientOptions, 'mode'>): Promise<string> {
  return callGeminiRaw(prompt, { ...options, mode: 'text' })
}

/**
 * Gemini API 사용 가능 여부
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY
}

/**
 * JSON 텍스트에서 객체 추출
 *
 * 마크다운 코드블록 또는 raw JSON에서 첫 { ~ 마지막 } 추출
 */
export function extractJSON<T>(text: string): T {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = (jsonMatch?.[1] ?? text).trim()

  const start = jsonStr.indexOf('{')
  const end = jsonStr.lastIndexOf('}')

  if (start === -1 || end === -1) {
    logger.error('No JSON found in response', {
      responsePreview: text.slice(0, 200),
    })
    throw new Error('No JSON found in response')
  }

  try {
    return JSON.parse(jsonStr.slice(start, end + 1))
  } catch (parseError) {
    logger.error('JSON parse error', {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      jsonPreview: jsonStr.slice(start, end + 1).slice(0, 200),
    })
    throw new Error('Failed to parse JSON from response')
  }
}
