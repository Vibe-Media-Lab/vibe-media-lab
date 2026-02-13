/**
 * Kie.ai HTTP Client
 *
 * Direct HTTP API client for kie.ai services
 * @see https://docs.kie.ai/
 */

import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'
import { retryWithBackoff } from '@/lib/utils/retry-with-backoff'

const KIEAI_BASE_URL = 'https://api.kie.ai'

// ============================================================
// Types
// ============================================================

export interface KieaiTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
    recordId?: string
  }
}

/** resultJson의 파싱된 객체 형태 */
export interface KieaiResultJsonObject {
  url?: string
  urls?: string[]
  audio_url?: string
  video_url?: string
  image_url?: string
  resultUrls?: string[]
  [key: string]: unknown
}

export interface KieaiTaskResult {
  taskId: string
  model: string
  state: 'pending' | 'processing' | 'success' | 'fail'
  param: Record<string, unknown>
  /** API가 객체 또는 JSON 문자열을 반환할 수 있음 */
  resultJson?: string | KieaiResultJsonObject
  failCode?: string
  failMsg?: string
  createTime?: string
  updateTime?: string
  completeTime?: string
}

export interface KieaiRecordInfoResponse {
  code: number
  msg: string
  data: KieaiTaskResult
}

export interface KieaiMusicResult {
  taskId: string
  state?: string
  parentMusicId?: string
  param?: string
  response?: {
    taskId: string
    sunoData?: Array<{
      id: string
      audioUrl: string
      sourceAudioUrl?: string
      streamAudioUrl?: string
      imageUrl?: string
      duration: number
      title?: string
      tags?: string
      modelName?: string
    }>
  }
  // Legacy format (kept for compatibility)
  data?: Array<{
    id: string
    audio_url: string
    video_url?: string
    duration: number
    title: string
    style?: string
  }>
}

export class KieaiError extends Error {
  constructor(
    message: string,
    public code: number,
    public failCode?: string
  ) {
    super(message)
    this.name = 'KieaiError'
  }
}

// ============================================================
// Result URL Extraction
// ============================================================

/**
 * kieai task 결과에서 URL을 안전하게 추출
 *
 * - resultJson이 JSON 문자열이면 파싱
 * - 6개 필드명 시도: url, image_url, video_url, audio_url, urls[0], resultUrls[0]
 * - 실패 시 null 반환 + console.warn
 */
export function extractResultUrl(
  resultJson: KieaiTaskResult['resultJson'],
  debugContext?: string,
): string | null {
  if (resultJson == null) {
    return null
  }

  let parsed: KieaiResultJsonObject
  if (typeof resultJson === 'string') {
    if (resultJson.length === 0) return null
    try {
      parsed = JSON.parse(resultJson)
    } catch {
      console.warn(`[kieai] Failed to parse resultJson as JSON${debugContext ? ` (${debugContext})` : ''}: ${resultJson.slice(0, 200)}`)
      return null
    }
  } else {
    parsed = resultJson
  }

  // 우선순위: url > image_url > video_url > audio_url > urls[0] > resultUrls[0]
  const url =
    parsed.url ||
    parsed.image_url ||
    parsed.video_url ||
    parsed.audio_url ||
    parsed.urls?.[0] ||
    parsed.resultUrls?.[0]

  if (!url) {
    const availableKeys = Object.keys(parsed).join(', ')
    console.warn(`[kieai] No URL found in resultJson${debugContext ? ` (${debugContext})` : ''}. Available keys: ${availableKeys}`)
    return null
  }

  return url
}

// ============================================================
// Client
// ============================================================

function getApiKey(): string {
  const apiKey = process.env.KIEAI_API_KEY
  if (!apiKey) {
    throw new KieaiError('KIEAI_API_KEY is not configured', 401)
  }
  return apiKey
}

/**
 * 단일 HTTP 요청 (timeout 적용, retry 없음)
 * createTask 등 멱등키 없는 호출에 사용
 */
async function requestOnce<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()
  const url = `${KIEAI_BASE_URL}${endpoint}`

  const response = await fetchWithTimeout(url, {
    ...options,
    timeoutMs: 30000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new KieaiError(
      `Request failed: ${response.statusText}`,
      response.status
    )
  }

  const data = await response.json()

  if (data.code && data.code !== 200) {
    throw new KieaiError(data.msg || 'Unknown error', data.code, data.failCode)
  }

  return data as T
}

/**
 * HTTP 요청 (timeout + retry 적용)
 * GET 등 멱등한 호출에 사용
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return retryWithBackoff(
    () => requestOnce<T>(endpoint, options),
    {
      maxRetries: 2,
      onRetry: (error, attempt, delayMs) => {
        console.warn(`[kieai] Retrying ${endpoint} (attempt ${attempt}, delay ${delayMs}ms):`, error instanceof Error ? error.message : error)
      },
    }
  )
}

// ============================================================
// Task API
// ============================================================

export async function createTask(
  model: string,
  input: Record<string, unknown>,
  callbackUrl?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    input,
  }

  if (callbackUrl) {
    body.callBackUrl = callbackUrl
  }

  // createTask는 멱등키 없음 — retry 시 중복 task 생성 + 과금 위험
  const response = await requestOnce<KieaiTaskResponse>('/api/v1/jobs/createTask', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return response.data.taskId
}

export async function getTaskResult(taskId: string): Promise<KieaiTaskResult> {
  const response = await request<KieaiRecordInfoResponse>(
    `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`
  )

  return response.data
}

/**
 * Poll for task completion with timeout
 */
export async function waitForTask(
  taskId: string,
  options: {
    maxWaitMs?: number
    pollIntervalMs?: number
    onProgress?: (state: string) => void
  } = {}
): Promise<KieaiTaskResult> {
  const { maxWaitMs = 300000, pollIntervalMs = 3000, onProgress } = options
  const startTime = Date.now()

  let pollCount = 0
  while (Date.now() - startTime < maxWaitMs) {
    let result: KieaiTaskResult
    try {
      result = await getTaskResult(taskId)
    } catch (pollError) {
      // 단일 폴링 실패는 무시하고 다음 폴링 계속 (timeout 체크 후)
      pollCount++
      console.warn(`[kieai] poll #${pollCount} failed for taskId=${taskId}:`, pollError instanceof Error ? pollError.message : pollError)

      if (Date.now() - startTime >= maxWaitMs) {
        throw new KieaiError('Task timeout (polling failed)', 408)
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      continue
    }

    pollCount++
    onProgress?.(result.state)

    if (pollCount <= 2) {
      // 초기 폴링 결과 로깅 (디버깅용)
      console.log(`[kieai] poll #${pollCount} taskId=${taskId} state=${result.state} resultJson=${JSON.stringify(result.resultJson).slice(0, 200)}`)
    }

    if (result.state === 'success') {
      return result
    }

    if (result.state === 'fail') {
      throw new KieaiError(
        result.failMsg || 'Task failed',
        500,
        result.failCode
      )
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new KieaiError('Task timeout', 408)
}

// ============================================================
// Music API (Suno has different endpoint)
// ============================================================

export async function createMusicTask(
  params: {
    prompt: string
    instrumental?: boolean
    model?: string
    style?: string
    title?: string
    customMode?: boolean
  },
  callbackUrl?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    instrumental: params.instrumental ?? true,
    model: params.model || 'V4_5',
    customMode: params.customMode ?? true,
    // Suno API requires callBackUrl - use dummy URL if not provided (we'll poll for results)
    callBackUrl: callbackUrl || 'https://example.com/webhook/suno',
  }

  if (params.style) {
    body.style = params.style
  }

  if (params.title) {
    body.title = params.title
  }

  // createMusicTask는 멱등키 없음 — retry 시 중복 과금 위험
  const response = await requestOnce<KieaiTaskResponse>('/api/v1/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return response.data.taskId
}

export async function getMusicResult(taskId: string): Promise<KieaiMusicResult> {
  const response = await request<{ code: number; data: KieaiMusicResult }>(
    `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`
  )

  return response.data
}

export async function waitForMusic(
  taskId: string,
  options: {
    maxWaitMs?: number
    pollIntervalMs?: number
    onProgress?: (state: string) => void
  } = {}
): Promise<KieaiMusicResult> {
  const { maxWaitMs = 300000, pollIntervalMs = 5000, onProgress } = options
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const result = await getMusicResult(taskId)

    // Check for new format (response.sunoData)
    // Find any track with a valid URL (audioUrl or streamAudioUrl)
    const sunoData = result.response?.sunoData
    const validTrack = sunoData?.find(
      (track) => track.audioUrl || track.streamAudioUrl
    )
    if (validTrack) {
      onProgress?.('complete')
      return result
    }

    // Check for legacy format (data array)
    if (result.data && result.data.length > 0 && result.data[0]?.audio_url) {
      onProgress?.('complete')
      return result
    }

    // Check state field if present
    if (result.state === 'complete' || result.state === 'success') {
      return result
    }

    if (result.state === 'fail' || result.state === 'error') {
      throw new KieaiError('Music generation failed', 500)
    }

    onProgress?.('processing')
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new KieaiError('Music generation timeout', 408)
}

// ============================================================
// Veo API (Google Veo3 via kieai)
// ============================================================

export interface KieaiVeoResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

export interface KieaiVeoResult {
  code: number
  msg: string
  data: {
    taskId: string
    successFlag: number  // 0=생성중, 1=성공, 2=실패, 3=실패
    videoUrl?: string
    failMsg?: string
  }
}

export async function createVeoTask(
  params: Record<string, unknown>,
): Promise<string> {
  const response = await requestOnce<KieaiVeoResponse>('/api/v1/veo/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  return response.data.taskId
}

export async function getVeoResult(taskId: string): Promise<KieaiVeoResult['data']> {
  const response = await request<KieaiVeoResult>(
    `/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
  )
  return response.data
}

export async function waitForVeoTask(
  taskId: string,
  options: {
    maxWaitMs?: number
    pollIntervalMs?: number
    onProgress?: (state: string) => void
  } = {},
): Promise<KieaiVeoResult['data']> {
  const { maxWaitMs = 600000, pollIntervalMs = 5000, onProgress } = options
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const result = await getVeoResult(taskId)
    onProgress?.(String(result.successFlag))

    if (result.successFlag === 1 && result.videoUrl) {
      return result
    }
    if (result.successFlag === 2 || result.successFlag === 3) {
      throw new KieaiError(result.failMsg || 'Veo task failed', 500)
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new KieaiError('Veo task timeout', 408)
}

// ============================================================
// Runway API (Runway via kieai)
// ============================================================

export interface KieaiRunwayResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

export interface KieaiRunwayResult {
  code: number
  msg: string
  data: {
    taskId: string
    state: 'wait' | 'queueing' | 'generating' | 'success' | 'fail'
    videoInfo?: {
      videoUrl?: string
    }
    failMsg?: string
  }
}

export async function createRunwayTask(
  params: Record<string, unknown>,
): Promise<string> {
  const response = await requestOnce<KieaiRunwayResponse>('/api/v1/runway/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  return response.data.taskId
}

export async function getRunwayResult(taskId: string): Promise<KieaiRunwayResult['data']> {
  const response = await request<KieaiRunwayResult>(
    `/api/v1/runway/record-detail?taskId=${encodeURIComponent(taskId)}`,
  )
  return response.data
}

export async function waitForRunwayTask(
  taskId: string,
  options: {
    maxWaitMs?: number
    pollIntervalMs?: number
    onProgress?: (state: string) => void
  } = {},
): Promise<KieaiRunwayResult['data']> {
  const { maxWaitMs = 600000, pollIntervalMs = 5000, onProgress } = options
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const result = await getRunwayResult(taskId)
    onProgress?.(result.state)

    if (result.state === 'success' && result.videoInfo?.videoUrl) {
      return result
    }
    if (result.state === 'fail') {
      throw new KieaiError(result.failMsg || 'Runway task failed', 500)
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new KieaiError('Runway task timeout', 408)
}

// ============================================================
// Video Input Builder (kieai Standard — 패밀리별 분기)
// ============================================================

interface KieaiVideoInputParams {
  prompt: string
  imageUrl?: string
  duration?: string
  aspectRatio?: string
  sound?: boolean
  resolution?: string
  tailImageUrl?: string
}

/**
 * kieai Standard API 모델별 입력 빌드
 *
 * 각 모델 패밀리가 서로 다른 파라미터 이름/형식을 사용하므로
 * family 기반으로 분기한다.
 */
export function buildKieaiVideoInput(
  family: string,
  params: KieaiVideoInputParams,
): Record<string, unknown> {
  const base: Record<string, unknown> = { prompt: params.prompt }

  switch (family) {
    case 'kling': {
      if (params.imageUrl) base.image_urls = [params.imageUrl]
      if (params.tailImageUrl && params.imageUrl) {
        base.image_urls = [params.imageUrl, params.tailImageUrl]
      }
      base.duration = params.duration || '5'
      base.aspect_ratio = params.aspectRatio || '16:9'
      base.sound = params.sound ?? false
      return base
    }

    case 'kling-turbo': {
      // Kling 2.5 Turbo: image_url (단수), tail_image_url
      if (params.imageUrl) base.image_url = params.imageUrl
      if (params.tailImageUrl) base.tail_image_url = params.tailImageUrl
      base.duration = params.duration || '5'
      return base
    }

    case 'kling3': {
      if (params.imageUrl) {
        base.image_urls = [params.imageUrl]
      }
      base.sound = params.sound ?? false
      base.duration = params.duration || '5'
      base.aspect_ratio = params.aspectRatio || '16:9'
      return base
    }

    case 'sora2': {
      if (params.imageUrl) base.image_urls = [params.imageUrl]
      // sora2: n_frames (10=짧은, 15=긴), aspect_ratio (landscape/portrait)
      const dur = params.duration || '10'
      base.n_frames = dur === '5' || dur === '10' ? 10 : 15
      const ar = params.aspectRatio || '16:9'
      base.aspect_ratio = ar === '9:16' ? 'portrait' : 'landscape'
      base.remove_watermark = true
      return base
    }

    case 'seedance': {
      if (params.imageUrl) base.image_urls = [params.imageUrl]
      base.duration = params.duration || '8'
      base.resolution = params.resolution || '1080P'
      return base
    }

    case 'hailuo': {
      // hailuo: image_url (단수!)
      if (params.imageUrl) base.image_url = params.imageUrl
      base.duration = params.duration || '6'
      base.resolution = params.resolution || '1080P'
      return base
    }

    case 'wan': {
      if (params.imageUrl) base.image_urls = [params.imageUrl]
      base.duration = params.duration || '5'
      base.resolution = params.resolution || '720p'
      return base
    }

    case 'grok': {
      if (params.imageUrl) base.image_urls = [params.imageUrl]
      base.mode = 'normal'
      base.duration = params.duration || '6'
      base.resolution = params.resolution || '720p'
      return base
    }

    default:
      // 미등록 family — fallback to basic input
      if (params.imageUrl) base.image_urls = [params.imageUrl]
      base.duration = params.duration || '5'
      return base
  }
}

// ============================================================
// Utility
// ============================================================

export function isKieaiAvailable(): boolean {
  return !!process.env.KIEAI_API_KEY
}
