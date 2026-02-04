/**
 * Creatomate HTTP Client
 *
 * Cloud-based video composition API client
 * @see https://creatomate.com/docs/api/introduction
 */

const CREATOMATE_BASE_URL = 'https://api.creatomate.com/v1'

// ============================================================
// Types
// ============================================================

export interface CreatomateElement {
  type: 'video' | 'audio' | 'image' | 'text' | 'composition'
  track?: number
  source?: string
  time?: number
  duration?: number
  volume?: string | number
  elements?: CreatomateElement[]
  fit?: 'cover' | 'contain' | 'fill'
  [key: string]: unknown
}

export interface CreatomateTemplate {
  output_format: 'mp4' | 'webm' | 'gif' | 'png' | 'jpg'
  width: number
  height: number
  frame_rate?: number
  duration?: number
  elements: CreatomateElement[]
}

export interface CreatomateRenderResponse {
  id: string
  status: 'planned' | 'waiting' | 'rendering' | 'succeeded' | 'failed'
  error_message?: string
  url?: string
  duration?: number
  created_at: string
  finished_at?: string
}

export interface CreateRenderParams {
  template: CreatomateTemplate
  modifications?: Record<string, unknown>
  webhook_url?: string
}

export class CreatomateError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string
  ) {
    super(message)
    this.name = 'CreatomateError'
  }
}

// ============================================================
// Client
// ============================================================

function getApiKey(): string {
  const apiKey = process.env.CREATOMATE_API_KEY
  if (!apiKey) {
    throw new CreatomateError('CREATOMATE_API_KEY is not configured', 401)
  }
  return apiKey
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()

  const response = await fetch(`${CREATOMATE_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    let errorMessage = `Request failed: ${response.statusText}`

    try {
      const errorJson = JSON.parse(errorBody)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      // Use default error message
    }

    throw new CreatomateError(errorMessage, response.status)
  }

  return response.json()
}

// ============================================================
// Render API
// ============================================================

/**
 * Create a new render job
 */
export async function createRender(
  params: CreateRenderParams
): Promise<CreatomateRenderResponse[]> {
  const body: Record<string, unknown> = {
    source: params.template,
  }

  if (params.modifications) {
    body.modifications = params.modifications
  }

  if (params.webhook_url) {
    body.webhook_url = params.webhook_url
  }

  const response = await request<CreatomateRenderResponse[]>('/renders', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return response
}

/**
 * Get render status by ID
 */
export async function getRenderStatus(
  renderId: string
): Promise<CreatomateRenderResponse> {
  // Validate renderId format (alphanumeric + hyphens only)
  if (!/^[a-zA-Z0-9-]+$/.test(renderId)) {
    throw new CreatomateError('Invalid render ID format', 400, 'INVALID_RENDER_ID')
  }
  return request<CreatomateRenderResponse>(`/renders/${renderId}`)
}

/**
 * Poll for render completion with timeout
 */
export async function waitForRender(
  renderId: string,
  options: {
    maxWaitMs?: number
    pollIntervalMs?: number
    onProgress?: (status: string, render: CreatomateRenderResponse) => void
  } = {}
): Promise<CreatomateRenderResponse> {
  const {
    maxWaitMs = 600000, // 10 minutes for long videos
    pollIntervalMs = 5000,
    onProgress,
  } = options
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const render = await getRenderStatus(renderId)
    onProgress?.(render.status, render)

    if (render.status === 'succeeded') {
      return render
    }

    if (render.status === 'failed') {
      throw new CreatomateError(
        render.error_message || 'Render failed',
        500,
        'RENDER_FAILED'
      )
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new CreatomateError('Render timeout', 408, 'RENDER_TIMEOUT')
}

// ============================================================
// Utility
// ============================================================

/**
 * Check if Creatomate API is configured
 */
export function isCreatomateAvailable(): boolean {
  return !!process.env.CREATOMATE_API_KEY
}

/**
 * Get service provider name
 */
export function getCreatomateProvider(): 'creatomate' | 'mock' {
  return isCreatomateAvailable() ? 'creatomate' : 'mock'
}
