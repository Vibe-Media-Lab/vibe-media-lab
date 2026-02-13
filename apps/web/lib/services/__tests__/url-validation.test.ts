/**
 * 서비스별 URL 검증 경로 테스트
 *
 * kieai API가 success 상태이지만 URL이 없는 경우
 * 각 서비스가 success:false를 반환하는지 검증
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock modules ---

// kieai-client mock — extractResultUrl은 실제 구현 사용
const mockCreateTask = vi.fn()
const mockWaitForTask = vi.fn()
const mockCreateVeoTask = vi.fn()
const mockWaitForVeoTask = vi.fn()
const mockCreateRunwayTask = vi.fn()
const mockWaitForRunwayTask = vi.fn()

vi.mock('../kieai-client', async () => {
  const actual = await vi.importActual<typeof import('../kieai-client')>('../kieai-client')
  return {
    ...actual,
    createTask: mockCreateTask,
    waitForTask: mockWaitForTask,
    createVeoTask: mockCreateVeoTask,
    waitForVeoTask: mockWaitForVeoTask,
    createRunwayTask: mockCreateRunwayTask,
    waitForRunwayTask: mockWaitForRunwayTask,
    isKieaiAvailable: () => true,
  }
})

vi.mock('../fal-client', () => ({
  isFalAvailable: () => true,
  falImageToVideo: vi.fn(),
  falTextToVideo: vi.fn(),
  falTextToSpeech: vi.fn(),
  falImageGenerate: vi.fn(),
  falImageEdit: vi.fn(),
}))

vi.mock('../gemini-image-client', () => ({
  isGeminiImageAvailable: () => true,
  generateImageFromText: vi.fn(),
  generateImageFromReference: vi.fn(),
  urlToBase64: vi.fn(),
  urlsToBase64: vi.fn(),
}))

vi.mock('../image-storage', () => ({
  saveImage: vi.fn(),
}))

vi.mock('../library-saver', () => ({
  saveToLibrary: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../supabase-storage', () => ({
  uploadMedia: vi.fn(),
}))

const mockGetVideoTransport = vi.fn((model: string) => ({
  modelId: model,
  apiType: model.includes('veo') ? 'kieai-veo' as const : model.includes('runway') ? 'kieai-runway' as const : 'kieai-standard' as const,
  family: 'kling',
  capabilities: { i2v: true, t2v: true },
  defaultDuration: '5',
}))

vi.mock('../video-transport', () => ({
  getVideoTransport: (...args: unknown[]) => mockGetVideoTransport(...args as [string]),
}))

const mockRouteModel = vi.fn((_model: string) => ({ modelId: _model, provider: 'kieai', fallbackUsed: false }))

vi.mock('@/lib/models/router', () => ({
  routeModel: (...args: unknown[]) => mockRouteModel(...args as [string]),
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
  VIDEO_MODELS: { defaultModelId: 'kling-2.6/image-to-video', models: [] },
  TEXT_TO_VIDEO_MODELS: { defaultModelId: 'kling-2.6/text-to-video', models: [] },
  TTS_MODELS: { defaultModelId: 'fal-ai/elevenlabs/tts/multilingual-v2', models: [] },
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

vi.mock('@/lib/utils/fetch-with-timeout', () => ({
  fetchWithTimeout: vi.fn(),
}))

vi.mock('@/lib/utils/retry-with-backoff', () => ({
  retryWithBackoff: vi.fn((fn: () => unknown) => fn()),
}))

// Suppress console.warn from extractResultUrl
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

// ============================================================
// image-service: kieai URL 없음 → success: false
// ============================================================

describe('image-service: kieai URL validation', () => {
  it('returns success:false when kieai image generation returns no URL', async () => {
    mockCreateTask.mockResolvedValue('task-img-1')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: {}, // 빈 객체 — URL 없음
    })

    const { generateImage } = await import('../image-service')
    const result = await generateImage({
      prompt: 'test prompt',
      model: 'nano-banana-pro',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('returned no URL')
    expect(result.error).toContain('nano-banana-pro')
  })

  it('extracts URL from JSON string resultJson', async () => {
    mockCreateTask.mockResolvedValue('task-img-2')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: JSON.stringify({ url: 'https://example.com/image.png' }),
    })

    // image-service imports saveImage which we need to mock properly
    const { saveImage } = await import('../image-storage')
    vi.mocked(saveImage).mockResolvedValue({ success: true, url: 'https://stored.example.com/image.png' })

    const { generateImage } = await import('../image-service')
    const result = await generateImage({
      prompt: 'test prompt',
      model: 'nano-banana-pro',
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://example.com/image.png')
  })
})

// ============================================================
// video-service: extractKieaiResult URL 없음
// ============================================================

describe('video-service: kieai URL validation', () => {
  it('returns success:false when extractKieaiResult finds no URL', async () => {
    mockCreateTask.mockResolvedValue('task-vid-1')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: {}, // 빈 객체 — URL 없음
    })

    const { imageToVideo } = await import('../video-service')
    const result = await imageToVideo({
      imageUrl: 'https://example.com/source.png',
      prompt: 'test video',
      model: 'kling-2.6/image-to-video',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('returned no URL')
  })

  it('returns success:false when Veo returns no videoUrl', async () => {
    mockCreateVeoTask.mockResolvedValue('task-veo-1')
    mockWaitForVeoTask.mockResolvedValue({
      taskId: 'task-veo-1',
      successFlag: 1,
      videoUrl: undefined, // URL 없음
    })

    mockRouteModel.mockReturnValueOnce({ modelId: 'veo3', provider: 'kieai', fallbackUsed: false })
    mockGetVideoTransport.mockReturnValueOnce({
      modelId: 'veo3',
      apiType: 'kieai-veo',
      family: 'veo',
      capabilities: { i2v: true, t2v: true },
      defaultDuration: '8',
    })

    const { imageToVideo } = await import('../video-service')
    const result = await imageToVideo({
      imageUrl: 'https://example.com/source.png',
      prompt: 'test veo',
      model: 'veo3',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('returned no URL')
  })

  it('returns success:false when Runway returns no videoUrl', async () => {
    mockCreateRunwayTask.mockResolvedValue('task-rw-1')
    mockWaitForRunwayTask.mockResolvedValue({
      taskId: 'task-rw-1',
      state: 'success',
      videoInfo: { videoUrl: undefined }, // URL 없음
    })

    mockRouteModel.mockReturnValueOnce({ modelId: 'runway-gen4', provider: 'kieai', fallbackUsed: false })
    mockGetVideoTransport.mockReturnValueOnce({
      modelId: 'runway-gen4',
      apiType: 'kieai-runway',
      family: 'runway',
      capabilities: { i2v: true, t2v: true },
      defaultDuration: '10',
    })

    const { imageToVideo } = await import('../video-service')
    const result = await imageToVideo({
      imageUrl: 'https://example.com/source.png',
      prompt: 'test runway',
      model: 'runway-gen4',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('returned no URL')
  })
})

// ============================================================
// audio-service: kieai TTS URL 없음
// ============================================================

describe('audio-service: kieai TTS URL validation', () => {
  it('returns success:false when kieai TTS returns no URL', async () => {
    mockCreateTask.mockResolvedValue('task-tts-1')
    mockWaitForTask.mockResolvedValue({
      state: 'success',
      resultJson: {}, // 빈 객체 — URL 없음
    })

    // Force kieai route
    mockRouteModel.mockReturnValueOnce({ modelId: 'elevenlabs/tts/multilingual-v2', provider: 'kieai', fallbackUsed: false })

    const { generateTTS } = await import('../audio-service')
    const result = await generateTTS({
      text: '안녕하세요 테스트입니다',
      model: 'elevenlabs/tts/multilingual-v2',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('returned no URL')
  })
})
