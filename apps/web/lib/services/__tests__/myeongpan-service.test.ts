/**
 * Myeongpan Interpretation Service 테스트
 *
 * - Gemini API mock
 * - 프롬프트 구조 검증
 * - 응답 파싱/검증
 * - Mock 모드 검증
 * - 옵션 변형 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetchWithTimeout before importing service
const mockFetchWithTimeout = vi.fn()
vi.mock('@/lib/utils/fetch-with-timeout', () => ({
  fetchWithTimeout: mockFetchWithTimeout,
  FetchTimeoutError: class extends Error {
    constructor(public url: string, public timeoutMs: number) {
      super(`Timeout`)
      this.name = 'FetchTimeoutError'
    }
  },
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((cb) => cb({ setTag: vi.fn(), setExtra: vi.fn() })),
  captureException: vi.fn(),
}))

// Mock router — gemini provider always available when GEMINI_API_KEY is set
vi.mock('@/lib/models/router', () => ({
  routeModel: vi.fn((modelId: string) => ({
    modelId,
    provider: 'gemini' as const,
    fallbackUsed: false,
  })),
  getManualFallback: vi.fn(() => null),
  resolveProvider: vi.fn(() => 'gemini' as const),
  isProviderAvailable: vi.fn(() => true),
}))

// Mock model-options
vi.mock('@/lib/constants/model-options', () => ({
  LLM_MODELS: {
    category: 'llm',
    options: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
    defaultModelId: 'gemini-2.5-flash',
  },
  ALLOWED_LLM_MODELS: ['gemini-2.5-flash', 'gemini-2.5-pro'] as const,
}))

// Mock supabase admin client
const mockSupabaseInsert = vi.fn()
const mockSupabaseSelect = vi.fn()
const mockSupabaseSingle = vi.fn()
const mockSupabaseEq = vi.fn()
const mockSupabaseLimit = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock env vars
const originalEnv = process.env

import type { UnifiedChart, InterpretationOptions } from '@vibe-media-lab/myeongpan-core'

// ============================================================
// Fixtures
// ============================================================

const MOCK_CHART: UnifiedChart = {
  saju: {
    pillars: {
      year: { hangul: '임신', hanja: '壬申', stem: '壬', branch: '申', stemElement: '수', branchElement: '금', stemYinYang: '양', branchYinYang: '양' },
      month: { hangul: '경술', hanja: '庚戌', stem: '庚', branch: '戌', stemElement: '금', branchElement: '토', stemYinYang: '양', branchYinYang: '양' },
      day: { hangul: '병자', hanja: '丙子', stem: '丙', branch: '子', stemElement: '화', branchElement: '수', stemYinYang: '양', branchYinYang: '양' },
      hour: { hangul: '신묘', hanja: '辛卯', stem: '辛', branch: '卯', stemElement: '금', branchElement: '목', stemYinYang: '음', branchYinYang: '음' },
    },
    fiveElements: { 목: 1, 화: 1, 토: 1, 금: 3, 수: 2 },
    yinYangBalance: { 양: 6, 음: 2 },
  },
  ziwei: {
    palaces: Array.from({ length: 12 }, (_, i) => ({
      index: i,
      name: ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'][i]!,
      isBodyPalace: i === 0,
      isOriginalPalace: i === 0,
      heavenlyStem: '甲',
      earthlyBranch: '子',
      majorStars: i === 0 ? [{ name: '紫微', type: 'major' as const, brightness: '廟', mutagen: '' }] : [],
      minorStars: [],
      adjectiveStars: [],
      changsheng12: '长生',
      decadal: null,
    })),
    soulPalaceEarthlyBranch: '子',
    bodyPalaceEarthlyBranch: '子',
    soul: '紫微',
    body: '天相',
    fiveElementsClass: '水二局',
    gender: '남',
    zodiac: '원숭이',
    sign: '天秤',
  },
  western: {
    planets: [
      { name: 'Sun', longitude: 210, latitude: 0, isRetrograde: false, sign: 'Scorpio', degree: 0, minute: 30, second: 0, formatted: '0°30\' Scorpio', house: 1, dignity: { state: 'neutral', strength: 50, description: '' } },
      { name: 'Moon', longitude: 330, latitude: 0, isRetrograde: false, sign: 'Aquarius', degree: 0, minute: 0, second: 0, formatted: '0°00\' Aquarius', house: 4, dignity: { state: 'neutral', strength: 50, description: '' } },
    ],
    houses: { system: 'placidus', cusps: [] },
    aspects: [],
    angles: {
      ascendant: { name: 'Ascendant', abbrev: 'ASC', longitude: 180, sign: 'Libra', degree: 0, minute: 0, second: 0, formatted: '0° Libra' },
      midheaven: { name: 'Midheaven', abbrev: 'MC', longitude: 90, sign: 'Cancer', degree: 0, minute: 0, second: 0, formatted: '0° Cancer' },
      descendant: { name: 'Descendant', abbrev: 'DSC', longitude: 0, sign: 'Aries', degree: 0, minute: 0, second: 0, formatted: '0° Aries' },
      imumCoeli: { name: 'Imum Coeli', abbrev: 'IC', longitude: 270, sign: 'Capricorn', degree: 0, minute: 0, second: 0, formatted: '0° Capricorn' },
    },
    sunSign: 'Scorpio',
    moonSign: 'Aquarius',
    risingSign: 'Libra',
    elements: { Fire: ['Mars'], Earth: ['Saturn'], Air: ['Moon'], Water: ['Sun'] },
    modalities: { Cardinal: ['Moon'], Fixed: ['Sun'], Mutable: [] },
    patterns: [],
  },
  meta: {
    engineVersions: { manseryeok: '1.0.7', iztro: '2.5.7', celestine: '0.2.1' },
    configHash: 'abc123def456',
    generatedAt: '2026-02-25T00:00:00.000Z',
    systemsCompleted: ['saju', 'ziwei', 'western'],
    errors: [],
    warnings: [],
  },
}

const VALID_LLM_RESPONSE = JSON.stringify({
  summary: '3체계 통합 분석 결과, 강한 리더십과 창의성을 가지고 있습니다.',
  keywords: ['리더십', '창의성', '금 오행', '전갈자리', '자미성'],
  sections: [
    {
      topic: 'personality',
      title: '성격 분석',
      body: '사주의 병화 일간과 서양 점성술의 전갈자리 태양이...',
      crossReferences: ['사주 병화 + 전갈자리 태양'],
    },
    {
      topic: 'career',
      title: '직업 분석',
      body: '자미두수 관록궁의 구성으로...',
      crossReferences: ['관록궁 + 10하우스'],
    },
  ],
  crossSystemAnalysis: {
    consensus: ['리더십 기질이 3체계에서 공통적으로 나타남', '금 에너지 과다'],
    contrasts: ['사주에서는 양 에너지가 강하나 서양 점성술에서는 수 원소 강조'],
    synthesis: '종합적으로 강한 리더십과 분석력을 겸비한 유형입니다.',
  },
})

function createGeminiResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
    text: async () => text,
  }
}

// ============================================================
// Tests
// ============================================================

describe('myeongpan-service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: 'test-api-key',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }

    // Default supabase mock chain
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null })
    mockSupabaseLimit.mockReturnValue({ single: mockSupabaseSingle })
    mockSupabaseEq.mockReturnValue({ eq: mockSupabaseEq, limit: mockSupabaseLimit, single: mockSupabaseSingle })
    mockSupabaseSelect.mockReturnValue({ eq: mockSupabaseEq, single: mockSupabaseSingle })
    mockSupabaseInsert.mockReturnValue({ select: mockSupabaseSelect })
    mockSupabaseFrom.mockReturnValue({
      insert: mockSupabaseInsert,
      select: mockSupabaseSelect,
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('interpretChart', () => {
    it('Gemini API를 호출하고 결과를 반환', async () => {
      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      // Dynamic import to pick up env vars
      const { interpretChart } = await import('../myeongpan-service')

      const result = await interpretChart(MOCK_CHART)

      expect(result.summary).toContain('리더십')
      expect(result.keywords.length).toBeGreaterThan(0)
      expect(result.sections.length).toBeGreaterThan(0)
      expect(result.systemsUsed).toEqual(['saju', 'ziwei', 'western'])
      expect(result.meta.model).toBe('gemini-2.5-flash')
      expect(result.meta.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('프롬프트에 차트 데이터가 포함됨', async () => {
      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      const { interpretChart } = await import('../myeongpan-service')

      await interpretChart(MOCK_CHART)

      const callArgs = mockFetchWithTimeout.mock.calls[0]!
      const body = JSON.parse(callArgs[1].body)

      // 시스템 프롬프트 검증
      expect(body.systemInstruction.parts[0].text).toContain('통합 명리학')
      // 사용자 프롬프트에 차트 데이터 포함
      expect(body.contents[0].parts[0].text).toContain('사주(四柱)')
    })

    it('tone=professional 시 프롬프트 변경', async () => {
      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      const { interpretChart } = await import('../myeongpan-service')

      await interpretChart(MOCK_CHART, { tone: 'professional' })

      const body = JSON.parse(mockFetchWithTimeout.mock.calls[0]![1].body)
      expect(body.systemInstruction.parts[0].text).toContain('전문적')
    })

    it('length=short 시 maxOutputTokens=4096', async () => {
      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      const { interpretChart } = await import('../myeongpan-service')

      await interpretChart(MOCK_CHART, { length: 'short' })

      const body = JSON.parse(mockFetchWithTimeout.mock.calls[0]![1].body)
      expect(body.generationConfig.maxOutputTokens).toBe(4096)
    })

    it('length=long 시 maxOutputTokens=16384', async () => {
      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      const { interpretChart } = await import('../myeongpan-service')

      await interpretChart(MOCK_CHART, { length: 'long' })

      const body = JSON.parse(mockFetchWithTimeout.mock.calls[0]![1].body)
      expect(body.generationConfig.maxOutputTokens).toBe(16384)
    })

    it('topics 필터 적용', async () => {
      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      const { interpretChart } = await import('../myeongpan-service')

      await interpretChart(MOCK_CHART, { topics: ['career', 'wealth'] })

      const body = JSON.parse(mockFetchWithTimeout.mock.calls[0]![1].body)
      expect(body.contents[0].parts[0].text).toContain('career, wealth')
    })

    it('잘못된 JSON 응답 시 에러', async () => {
      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse('invalid json response'))

      const { interpretChart } = await import('../myeongpan-service')

      await expect(interpretChart(MOCK_CHART)).rejects.toThrow()
    })

    it('Gemini API 실패 시 에러 + Sentry 캡처', async () => {
      mockFetchWithTimeout.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'error',
      })

      const Sentry = await import('@sentry/nextjs')
      const { interpretChart } = await import('../myeongpan-service')

      await expect(interpretChart(MOCK_CHART)).rejects.toThrow('Gemini API error')
      expect(Sentry.withScope).toHaveBeenCalled()
    })
  })

  describe('Mock 모드', () => {
    it('GEMINI_API_KEY 미설정 시 Mock 반환', async () => {
      process.env.GEMINI_API_KEY = ''

      const { interpretChart } = await import('../myeongpan-service')

      const result = await interpretChart(MOCK_CHART)

      expect(result.meta.model).toBe('mock')
      expect(result.summary).toContain('Mock')
      expect(mockFetchWithTimeout).not.toHaveBeenCalled()
    })
  })

  describe('mergeOptions', () => {
    it('기본값 적용', async () => {
      const { mergeOptions } = await import('../myeongpan-service')

      const opts = mergeOptions()
      expect(opts.tone).toBe('warm')
      expect(opts.length).toBe('medium')
      expect(opts.language).toBe('ko')
    })

    it('부분 오버라이드', async () => {
      const { mergeOptions } = await import('../myeongpan-service')

      const opts = mergeOptions({ tone: 'professional', length: 'long' })
      expect(opts.tone).toBe('professional')
      expect(opts.length).toBe('long')
      expect(opts.language).toBe('ko')
    })
  })

  describe('unknownTime 처리', () => {
    it('unknownTime 차트는 사주만 포맷', async () => {
      const unknownChart: UnifiedChart = {
        ...MOCK_CHART,
        ziwei: null,
        western: null,
        meta: {
          ...MOCK_CHART.meta,
          systemsCompleted: ['saju'],
          warnings: ['출생시간 미상: 자미두수/서양점성 계산 생략'],
        },
      }

      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      const { interpretChart } = await import('../myeongpan-service')

      await interpretChart(unknownChart)

      const body = JSON.parse(mockFetchWithTimeout.mock.calls[0]![1].body)
      const userPrompt: string = body.contents[0].parts[0].text
      expect(userPrompt).toContain('사주')
      expect(userPrompt).not.toContain('자미두수(紫微斗數) 분석')
      expect(userPrompt).toContain('출생시간 미상')
    })
  })

  describe('language 옵션', () => {
    it('language=en 시 프롬프트에 영어 지시', async () => {
      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      const { interpretChart } = await import('../myeongpan-service')

      await interpretChart(MOCK_CHART, { language: 'en' })

      const body = JSON.parse(mockFetchWithTimeout.mock.calls[0]![1].body)
      expect(body.systemInstruction.parts[0].text).toContain('영어로 작성')
    })
  })

  describe('LLM 모델 선택', () => {
    it('기본 모델(gemini-2.5-flash) URL + meta.model 반영', async () => {
      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      const { interpretChart } = await import('../myeongpan-service')

      const result = await interpretChart(MOCK_CHART)

      // URL에 기본 모델 포함
      const callUrl = mockFetchWithTimeout.mock.calls[0]![0] as string
      expect(callUrl).toContain('gemini-2.5-flash')
      // meta.model 반영
      expect(result.meta.model).toBe('gemini-2.5-flash')
    })

    it('지정 모델(gemini-2.5-pro) URL + meta.model 반영', async () => {
      const { routeModel } = await import('@/lib/models/router')
      vi.mocked(routeModel).mockReturnValue({
        modelId: 'gemini-2.5-pro',
        provider: 'gemini',
        fallbackUsed: false,
      })

      mockFetchWithTimeout.mockResolvedValue(createGeminiResponse(VALID_LLM_RESPONSE))

      const { interpretChart } = await import('../myeongpan-service')

      const result = await interpretChart(MOCK_CHART, undefined, 'gemini-2.5-pro')

      const callUrl = mockFetchWithTimeout.mock.calls[0]![0] as string
      expect(callUrl).toContain('gemini-2.5-pro')
      expect(result.meta.model).toBe('gemini-2.5-pro')
    })

    it('Mock 모드에서 meta.model은 항상 mock', async () => {
      process.env.GEMINI_API_KEY = ''

      const { interpretChart } = await import('../myeongpan-service')

      const result = await interpretChart(MOCK_CHART, undefined, 'gemini-2.5-pro')

      expect(result.meta.model).toBe('mock')
      expect(mockFetchWithTimeout).not.toHaveBeenCalled()
    })

    it('모든 provider 불가 시 에러', async () => {
      const { routeModel } = await import('@/lib/models/router')
      vi.mocked(routeModel).mockReturnValue(null)

      const { interpretChart } = await import('../myeongpan-service')

      await expect(interpretChart(MOCK_CHART)).rejects.toThrow('사용 가능한 LLM 서비스가 없습니다')
    })
  })
})
