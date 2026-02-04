/**
 * Kie.ai HTTP Client
 *
 * Direct HTTP API client for kie.ai services
 * @see https://docs.kie.ai/
 */

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

export interface KieaiTaskResult {
  taskId: string
  model: string
  state: 'pending' | 'processing' | 'success' | 'fail'
  param: Record<string, unknown>
  resultJson?: {
    url?: string
    urls?: string[]
    audio_url?: string
    video_url?: string
    image_url?: string
    [key: string]: unknown
  }
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
// Client
// ============================================================

function getApiKey(): string {
  const apiKey = process.env.KIEAI_API_KEY
  if (!apiKey) {
    throw new KieaiError('KIEAI_API_KEY is not configured', 401)
  }
  return apiKey
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()

  const response = await fetch(`${KIEAI_BASE_URL}${endpoint}`, {
    ...options,
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

  return data
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

  const response = await request<KieaiTaskResponse>('/api/v1/jobs/createTask', {
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

  while (Date.now() - startTime < maxWaitMs) {
    const result = await getTaskResult(taskId)
    onProgress?.(result.state)

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

  const response = await request<KieaiTaskResponse>('/api/v1/generate', {
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
// Utility
// ============================================================

export function isKieaiAvailable(): boolean {
  return !!process.env.KIEAI_API_KEY
}
