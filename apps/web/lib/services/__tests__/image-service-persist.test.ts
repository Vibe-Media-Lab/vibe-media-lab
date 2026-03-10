/**
 * persistTempUrl 테스트
 *
 * 임시 CDN URL → Supabase Storage 영속화 헬퍼 검증.
 * kieai/fal 모두 이 헬퍼를 통해 영속 URL을 확보.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

const mockSaveImage = vi.fn()
vi.mock('../image-storage', () => ({
  saveImage: (...args: unknown[]) => mockSaveImage(...args),
}))

const mockFetchWithTimeout = vi.fn()
vi.mock('@/lib/utils/fetch-with-timeout', () => ({
  fetchWithTimeout: (...args: unknown[]) => mockFetchWithTimeout(...args),
}))

// SSRF validation — 실제 구현 사용 (보안 검증)
vi.mock('@/lib/security/validate-url', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security/validate-url')>('@/lib/security/validate-url')
  return actual
})

vi.mock('@/lib/security/security-logger', () => ({
  logSecurityEvent: vi.fn(),
}))

const mockCreateTask = vi.fn()
const mockWaitForTask = vi.fn()

vi.mock('../kieai-client', async () => {
  const actual = await vi.importActual<typeof import('../kieai-client')>('../kieai-client')
  return {
    ...actual,
    createTask: (...args: unknown[]) => mockCreateTask(...args),
    waitForTask: (...args: unknown[]) => mockWaitForTask(...args),
    isKieaiAvailable: () => true,
  }
})

vi.mock('../fal-client', () => ({
  isFalAvailable: () => false,
  falImageGenerate: vi.fn(),
  falImageEdit: vi.fn(),
}))

vi.mock('../gemini-image-client', () => ({
  isGeminiImageAvailable: () => false,
  generateImageFromText: vi.fn(),
  generateImageFromReference: vi.fn(),
  urlToBase64: vi.fn(),
  urlsToBase64: vi.fn(),
}))

vi.mock('../library-saver', () => ({
  saveToLibrary: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/models/router', () => ({
  routeModel: (_model: string) => ({ modelId: _model, provider: 'kieai', fallbackUsed: false }),
  buildResultMeta: () => ({}),
  getManualFallback: () => null,
  resolveProvider: () => 'kieai',
  isProviderAvailable: () => true,
}))

vi.mock('@/lib/models/catalog', () => ({
  MODEL_CATALOG: [],
}))

vi.mock('@/lib/constants/model-options', () => ({
  IMAGE_GEN_MODELS: { defaultModelId: 'nano-banana-pro', models: [] },
  IMAGE_EDIT_MODELS: { defaultModelId: 'fal-ai/nano-banana-pro/edit', models: [] },
}))

vi.mock('@sentry/nextjs', () => ({
  withScope: (fn: (scope: unknown) => void) => fn({
    setTag: vi.fn(),
    setLevel: vi.fn(),
    setExtra: vi.fn(),
    setFingerprint: vi.fn(),
  }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  mockSaveImage.mockReset()
  mockFetchWithTimeout.mockReset()
  mockCreateTask.mockReset()
  mockWaitForTask.mockReset()
})

describe('persistTempUrl via generateImage (kieai)', () => {
  it('persists kieai temp URL to Supabase Storage', async () => {
    mockCreateTask.mockResolvedValue('task-1')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: { url: 'https://cdn.kie.ai/temp-image.png' },
    })
    mockFetchWithTimeout.mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(16),
      headers: new Headers({ 'content-type': 'image/png' }),
    })
    mockSaveImage.mockResolvedValue({
      success: true,
      url: 'https://supabase.co/storage/gen/abc.png',
    })

    const { generateImage } = await import('../image-service')
    const result = await generateImage({
      prompt: 'test portrait',
      model: 'nano-banana-pro',
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://supabase.co/storage/gen/abc.png')

    // fetchWithTimeout called with kieai temp URL
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://cdn.kie.ai/temp-image.png',
      { timeoutMs: 45000 },
    )

    // saveImage called with base64 from fetched buffer
    expect(mockSaveImage).toHaveBeenCalledWith({
      base64: expect.any(String),
      mimeType: 'image/png',
      prefix: 'gen',
    })
  })

  it('returns success:false when persistence fails (hard fail)', async () => {
    mockCreateTask.mockResolvedValue('task-2')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: { url: 'https://cdn.kie.ai/temp.png' },
    })
    mockFetchWithTimeout.mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ 'content-type': 'image/png' }),
    })
    mockSaveImage.mockResolvedValue({
      success: false,
      error: 'Storage quota exceeded',
    })

    const { generateImage } = await import('../image-service')
    const result = await generateImage({
      prompt: 'test',
      model: 'nano-banana-pro',
    })

    // Hard fail — 임시 URL fallback 없음
    expect(result.success).toBe(false)
    expect(result.error).toContain('Image generation failed')
  })

  it('returns success:false when download times out', async () => {
    mockCreateTask.mockResolvedValue('task-3')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: { url: 'https://cdn.kie.ai/temp.png' },
    })
    mockFetchWithTimeout.mockRejectedValue(new Error('FetchTimeoutError'))

    const { generateImage } = await import('../image-service')
    const result = await generateImage({
      prompt: 'test',
      model: 'nano-banana-pro',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Image generation failed')
  })
})

describe('persistTempUrl via editImage (kieai)', () => {
  it('persists kieai edit temp URL to Supabase Storage', async () => {
    // kieai editImage도 동일한 persistTempUrl 사용
    mockCreateTask.mockResolvedValue('task-edit-1')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: { url: 'https://cdn.kie.ai/edit-temp.png' },
    })
    mockFetchWithTimeout.mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(16),
      headers: new Headers({ 'content-type': 'image/webp' }),
    })
    mockSaveImage.mockResolvedValue({
      success: true,
      url: 'https://supabase.co/storage/edit/xyz.webp',
    })

    // 기본 mock이 모든 모델을 kieai로 라우팅
    const { editImage } = await import('../image-service')
    const result = await editImage({
      prompt: 'edit test',
      referenceUrls: ['https://example.com/ref.png'],
      model: 'nano-banana-pro/edit',
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://supabase.co/storage/edit/xyz.webp')
    expect(mockSaveImage).toHaveBeenCalledWith({
      base64: expect.any(String),
      mimeType: 'image/webp',
      prefix: 'edit',
    })
  })
})

describe('SSRF protection in persistTempUrl', () => {
  it('blocks non-whitelisted URL from kieai response', async () => {
    mockCreateTask.mockResolvedValue('task-ssrf-1')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: { url: 'http://169.254.169.254/latest/meta-data/' },
    })

    const { generateImage } = await import('../image-service')
    const result = await generateImage({
      prompt: 'ssrf test',
      model: 'nano-banana-pro',
    })

    expect(result.success).toBe(false)
    // fetchWithTimeout should NOT have been called — blocked before fetch
    expect(mockFetchWithTimeout).not.toHaveBeenCalled()
  })

  it('blocks internal IP from kieai response', async () => {
    mockCreateTask.mockResolvedValue('task-ssrf-2')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: { url: 'https://10.0.0.1/internal/image.png' },
    })

    const { generateImage } = await import('../image-service')
    const result = await generateImage({
      prompt: 'ssrf internal test',
      model: 'nano-banana-pro',
    })

    expect(result.success).toBe(false)
    expect(mockFetchWithTimeout).not.toHaveBeenCalled()
  })
})
