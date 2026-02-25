/**
 * Myeongpan Interpretation Service
 *
 * 3체계 통합 차트 → Gemini LLM 풀이 + Supabase 저장
 *
 * @see docs/myeongpan/API-SPEC.md
 */

import * as Sentry from '@sentry/nextjs'
import type {
  BirthProfile,
  UnifiedChart,
  InterpretationOptions,
  InterpretationResult,
  InterpretationSection,
  CrossSystemAnalysis,
  InterpretationTopic,
} from '@vibe-media-lab/myeongpan-core'
import {
  calculateUnifiedChart,
  formatChartForLLM,
  estimateTokenCount,
  getMaxOutputTokens,
} from '@vibe-media-lab/myeongpan-core'
import { getLogger } from '@/lib/logger'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'
import { retryWithBackoff } from '@/lib/utils/retry-with-backoff'
import { createAdminClient } from '@/lib/supabase/admin'
import { routeModel, getManualFallback, resolveProvider, isProviderAvailable } from '@/lib/models/router'
import { LLM_MODELS } from '@/lib/constants/model-options'

const logger = getLogger('myeongpan-service')

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const IS_MOCK = !GEMINI_API_KEY
const DEFAULT_LLM_MODEL = LLM_MODELS.defaultModelId || 'gemini-3-flash-preview'

// ============================================================
// Default Options
// ============================================================

const DEFAULT_OPTIONS: InterpretationOptions = {
  tone: 'warm',
  length: 'medium',
  language: 'ko',
}

export function mergeOptions(opts?: Partial<InterpretationOptions>): InterpretationOptions {
  return { ...DEFAULT_OPTIONS, ...opts }
}

// ============================================================
// Chart Calculation + Save
// ============================================================

export async function calculateAndSaveChart(
  profile: BirthProfile,
  userId: string
): Promise<{ chartId: string; chart: UnifiedChart }> {
  const chart = await calculateUnifiedChart(profile)
  const configHash = chart.meta.configHash

  const supabase = createAdminClient()

  // 동일 configHash 캐시 히트 확인
  const { data: existing } = await supabase
    .from('myeongpan_charts')
    .select('id')
    .eq('user_id', userId)
    .eq('config_hash', configHash)
    .limit(1)
    .single()

  if (existing) {
    logger.info('Chart cache hit', { userId, configHash, chartId: existing.id })
    return { chartId: existing.id, chart }
  }

  // Insert + handle race condition (unique violation)
  const { data: inserted, error } = await supabase
    .from('myeongpan_charts')
    .insert({
      user_id: userId,
      birth_profile: profile as unknown as Record<string, unknown>,
      chart: chart as unknown as Record<string, unknown>,
      config_hash: configHash,
      place_name: profile.location.placeName || null,
      gender: profile.gender,
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique_violation (동시 요청으로 인한 중복)
    if (error.code === '23505') {
      const { data: dup } = await supabase
        .from('myeongpan_charts')
        .select('id')
        .eq('user_id', userId)
        .eq('config_hash', configHash)
        .limit(1)
        .single()
      if (dup) {
        logger.info('Chart cache hit (race)', { userId, configHash, chartId: dup.id })
        return { chartId: dup.id, chart }
      }
    }
    logger.error('Failed to save chart', { error: error.message, code: error.code })
    throw new Error(`차트 저장 실패: ${error.message}`)
  }

  if (!inserted) {
    throw new Error('차트 저장 실패: no data returned')
  }

  logger.info('Chart saved', { userId, chartId: inserted.id, configHash })
  return { chartId: inserted.id, chart }
}

// ============================================================
// LLM Interpretation
// ============================================================

/**
 * 시스템 프롬프트: 3체계 통합 명리학자 페르소나
 */
function buildSystemPrompt(options: InterpretationOptions, systemsUsed: string[]): string {
  const toneGuide: Record<string, string> = {
    warm: '따뜻하고 격려하는 어조로, 상담을 받는 사람이 편안하게 느끼도록 작성합니다. "~하는 경향이 있으시네요", "~한 에너지를 가지고 계십니다" 같은 표현을 사용하세요.',
    neutral: '중립적이고 객관적인 어조로, 학술적 분석처럼 작성합니다.',
    professional: '전문적이고 심층적인 분석 어조로, 구체적 근거와 전문 용어를 적극 활용합니다.',
  }

  const lang = options.language === 'en' ? '영어로 작성하세요.' : '한국어로 작성하세요.'

  return `당신은 사주명리학, 자미두수, 서양 점성술 3체계에 정통한 통합 명리학 전문가입니다.

## 역할
- 주어진 출생 차트 데이터를 분석하여 종합적인 해석을 제공합니다.
- 사용 가능한 체계: ${systemsUsed.join(', ')}

## 작성 원칙
1. **구체적 근거 인용 필수**: 반드시 차트 데이터의 구체적 요소를 인용하세요.
   예: "사주 일간 병화(丙火)는...", "자미두수 명궁의 자미성은...", "태양이 전갈자리에 위치하여..."
2. **교차 분석 필수**: 여러 체계 간의 공통점과 차이점을 반드시 분석하세요.
   예: "사주의 수(水) 오행 과다는 서양 점성술에서 물병자리 달의 감성적 특성과 공명합니다."
3. **단정적 표현 금지**: "~입니다"보다 "~하는 경향이 있습니다", "~할 수 있습니다" 등 경향성 표현을 사용하세요.
4. **한 체계만 있으면**: 교차 분석은 생략하되, 해당 체계 내에서 최대한 심층 분석하세요.

## 어조
${toneGuide[options.tone]}

## 언어
${lang}

## 응답 형식 (JSON)
반드시 아래 JSON 구조로 응답하세요:
{
  "summary": "전체 요약 (2-3문장)",
  "keywords": ["핵심 키워드 5-8개"],
  "sections": [
    {
      "topic": "personality|career|relationships|health|wealth|timing",
      "title": "섹션 제목",
      "body": "본문 (마크다운 지원)",
      "crossReferences": ["교차 분석 포인트들"]
    }
  ],
  "crossSystemAnalysis": {
    "consensus": ["체계 간 공통점들"],
    "contrasts": ["체계 간 차이점/대비점들"],
    "synthesis": "종합 분석 (1-2 단락)"
  }
}`
}

/**
 * 사용자 프롬프트: 차트 데이터 + 길이/주제 지시
 */
function buildUserPrompt(
  chartText: string,
  options: InterpretationOptions
): string {
  const lengthGuide: Record<string, string> = {
    short: 'sections는 3개 이내, 각 주제당 2-3문장으로 간결하게.',
    medium: 'sections는 4-6개, 각 주제당 1-2 단락으로 적절한 깊이로.',
    long: 'sections는 6개 이상, 각 주제를 상세하게, 교차 분석도 깊이 있게.',
  }

  const topicsGuide = options.topics && options.topics.length > 0
    ? `다음 주제만 분석하세요: ${options.topics.join(', ')}`
    : '모든 주제(personality, career, relationships, health, wealth, timing)를 분석하세요.'

  return `${chartText}

---

## 분석 지시
- 길이: ${lengthGuide[options.length]}
- 주제: ${topicsGuide}
- crossSystemAnalysis의 consensus/contrasts는 각각 최소 2개 이상 제시하세요.
- keywords는 5-8개 제시하세요.`
}

/**
 * Gemini API 호출
 */
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens: number,
  modelId: string = DEFAULT_LLM_MODEL,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`

  return retryWithBackoff(
    async () => {
      const response = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        timeoutMs: 90000,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens,
            responseMimeType: 'application/json',
          },
        }),
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
          finishReason: data.candidates?.[0]?.finishReason,
        })
        throw new Error('No response from Gemini')
      }

      return text
    },
    {
      maxRetries: 2,
      onRetry: (error, attempt, delayMs) => {
        logger.warn('Gemini interpretation retry', {
          attempt,
          delayMs,
          error: error instanceof Error ? error.message : String(error),
        })
      },
    }
  )
}

/**
 * JSON 추출 + 파싱 (fallback: 마크다운 코드 블록 제거)
 */
function extractJSON<T>(text: string): T {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = (jsonMatch?.[1] ?? text).trim()

  const start = jsonStr.indexOf('{')
  const end = jsonStr.lastIndexOf('}')

  if (start === -1 || end === -1) {
    logger.error('No JSON found in interpretation response', {
      responsePreview: text.slice(0, 200),
    })
    throw new Error('No JSON found in interpretation response')
  }

  try {
    return JSON.parse(jsonStr.slice(start, end + 1))
  } catch (parseError) {
    logger.error('JSON parse error in interpretation', {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      jsonPreview: jsonStr.slice(start, start + 200),
    })
    throw new Error('Failed to parse interpretation JSON')
  }
}

/**
 * LLM 해석 응답 검증
 */
const VALID_TOPICS: InterpretationTopic[] = [
  'personality', 'career', 'relationships', 'health', 'wealth', 'timing',
]

function validateInterpretation(raw: unknown): {
  summary: string
  keywords: string[]
  sections: InterpretationSection[]
  crossSystemAnalysis: CrossSystemAnalysis
} {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    logger.error('Unexpected interpretation response shape', {
      type: typeof raw,
      isArray: Array.isArray(raw),
    })
    throw new Error('Invalid interpretation: expected JSON object')
  }

  const data = raw as Record<string, unknown>

  if (typeof data.summary !== 'string' || !data.summary) {
    throw new Error('Invalid interpretation: missing summary')
  }

  const keywords = Array.isArray(data.keywords)
    ? (data.keywords as string[]).filter((k) => typeof k === 'string')
    : []

  const sections = Array.isArray(data.sections)
    ? (data.sections as InterpretationSection[]).map((s) => {
        const rawTopic = String(s.topic || '')
        const topic: InterpretationTopic = VALID_TOPICS.includes(rawTopic as InterpretationTopic)
          ? (rawTopic as InterpretationTopic)
          : 'personality'
        return {
          topic,
          title: String(s.title || ''),
          body: String(s.body || ''),
          crossReferences: Array.isArray(s.crossReferences)
            ? s.crossReferences.map(String)
            : [],
        }
      })
    : []

  const cross = data.crossSystemAnalysis as CrossSystemAnalysis | undefined
  const crossSystemAnalysis: CrossSystemAnalysis = {
    consensus: Array.isArray(cross?.consensus) ? cross!.consensus.map(String) : [],
    contrasts: Array.isArray(cross?.contrasts) ? cross!.contrasts.map(String) : [],
    synthesis: typeof cross?.synthesis === 'string' ? cross.synthesis : '',
  }

  return { summary: data.summary, keywords, sections, crossSystemAnalysis }
}

// ============================================================
// Mock Response (API 키 미설정 시)
// ============================================================

function createMockInterpretation(
  chart: UnifiedChart,
  options: InterpretationOptions
): InterpretationResult {
  const systemsUsed = chart.meta.systemsCompleted

  const defaultTopics: InterpretationTopic[] = ['personality', 'career', 'relationships']
  const topics = options.topics && options.topics.length > 0 ? options.topics : defaultTopics

  return {
    summary: '[Mock] 3체계 통합 해석 결과입니다. 실제 API 키를 설정하면 정확한 해석이 제공됩니다.',
    keywords: ['mock', '테스트', '통합해석'],
    sections: topics.slice(0, 3).map((topic) => ({
      topic,
      title: `${topic} 분석 (Mock)`,
      body: `이것은 ${topic} 주제의 Mock 해석입니다.`,
      crossReferences: ['Mock 교차 분석'],
    })),
    crossSystemAnalysis: {
      consensus: ['Mock: 체계 간 공통점'],
      contrasts: ['Mock: 체계 간 차이점'],
      synthesis: 'Mock: 종합 분석 결과',
    },
    systemsUsed,
    meta: {
      model: 'mock',
      latencyMs: 0,
      inputTokenEstimate: 0,
      options,
      chartConfigHash: chart.meta.configHash,
    },
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * 통합 차트 → LLM 해석
 */
export async function interpretChart(
  chart: UnifiedChart,
  options?: Partial<InterpretationOptions>,
  model?: string,
): Promise<InterpretationResult> {
  const opts = mergeOptions(options)
  const systemsUsed = chart.meta.systemsCompleted

  // Mock 모드
  if (IS_MOCK) {
    logger.info('Using mock interpretation (GEMINI_API_KEY not set)')
    return createMockInterpretation(chart, opts)
  }

  const requestedModel = model ?? DEFAULT_LLM_MODEL
  const startTime = Date.now()

  // routeModel — provider 가용성 + fallback chain
  const route = routeModel(requestedModel, 'llm')
  if (!route) {
    throw new Error('사용 가능한 LLM 서비스가 없습니다.')
  }

  // 프롬프트 사전 계산 (primary/fallback 공유)
  const chartText = formatChartForLLM(chart)
  const inputTokenEstimate = estimateTokenCount(chartText)
  const systemPrompt = buildSystemPrompt(opts, systemsUsed)
  const userPrompt = buildUserPrompt(chartText, opts)
  const maxOutputTokens = getMaxOutputTokens(opts.length)

  try {
    const rawText = await callGemini(systemPrompt, userPrompt, maxOutputTokens, route.modelId)
    const rawJson = extractJSON<unknown>(rawText)
    const validated = validateInterpretation(rawJson)

    const result: InterpretationResult = {
      ...validated,
      systemsUsed,
      meta: {
        model: route.modelId,
        latencyMs: Date.now() - startTime,
        inputTokenEstimate,
        options: opts,
        chartConfigHash: chart.meta.configHash,
      },
    }

    logger.info('Interpretation completed', {
      model: route.modelId,
      fallbackUsed: route.fallbackUsed,
      latencyMs: result.meta.latencyMs,
      systemsUsed,
      sectionsCount: result.sections.length,
    })

    return result
  } catch (error) {
    // 1차 실패 → getManualFallback 1회 재시도 (retry 없이)
    const fallbackId = getManualFallback(route.modelId, 'llm')
    if (fallbackId) {
      const fbProvider = resolveProvider(fallbackId)
      if (isProviderAvailable(fbProvider)) {
        logger.info('LLM falling back', { from: route.modelId, to: fallbackId })
        try {
          const rawText = await callGemini(systemPrompt, userPrompt, maxOutputTokens, fallbackId)
          const rawJson = extractJSON<unknown>(rawText)
          const validated = validateInterpretation(rawJson)

          return {
            ...validated,
            systemsUsed,
            meta: {
              model: fallbackId,
              latencyMs: Date.now() - startTime,
              inputTokenEstimate,
              options: opts,
              chartConfigHash: chart.meta.configHash,
            },
          }
        } catch (fbError) {
          logger.error('LLM fallback also failed', {
            fallbackId,
            error: fbError instanceof Error ? fbError.message : String(fbError),
          })
        }
      }
    }

    const latencyMs = Date.now() - startTime

    Sentry.withScope((scope) => {
      scope.setTag('service', 'myeongpan-interpretation')
      scope.setExtra('requestedModel', requestedModel)
      scope.setExtra('routedModel', route.modelId)
      scope.setExtra('latencyMs', latencyMs)
      scope.setExtra('systemsUsed', systemsUsed)
      Sentry.captureException(error)
    })

    logger.error('Interpretation failed', {
      error: error instanceof Error ? error.message : String(error),
      latencyMs,
    })

    throw error
  }
}

/**
 * 해석 결과 Supabase 저장
 */
export async function saveInterpretation(
  chartId: string,
  userId: string,
  result: InterpretationResult,
  options: InterpretationOptions
): Promise<string> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('myeongpan_interpretations')
    .insert({
      chart_id: chartId,
      user_id: userId,
      interpretation: result as unknown as Record<string, unknown>,
      options: options as unknown as Record<string, unknown>,
      model: result.meta.model,
      latency_ms: result.meta.latencyMs,
    })
    .select('id')
    .single()

  if (error || !data) {
    logger.error('Failed to save interpretation', { error: error?.message })
    throw new Error(`해석 저장 실패: ${error?.message}`)
  }

  logger.info('Interpretation saved', { chartId, interpretationId: data.id })
  return data.id
}

/**
 * chartId로 차트 조회
 */
export async function getChartById(
  chartId: string,
  userId: string
): Promise<{ chart: UnifiedChart; profile: BirthProfile } | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('myeongpan_charts')
    .select('chart, birth_profile')
    .eq('id', chartId)
    .eq('user_id', userId)
    .single()

  if (error) {
    // PGRST116 = no rows found — 정상적으로 "not found"
    if (error.code === 'PGRST116') return null
    logger.error('DB error in getChartById', { error: error.message, chartId })
    throw new Error(`차트 조회 오류: ${error.message}`)
  }
  if (!data) return null

  return {
    chart: data.chart as unknown as UnifiedChart,
    profile: data.birth_profile as unknown as BirthProfile,
  }
}

// ============================================================
// Chart CRUD (3단계: 웹 페이지용)
// ============================================================

export interface SavedChartSummary {
  id: string
  placeName: string | null
  gender: string
  createdAt: string
  systemsCompleted: string[]
  hasInterpretation: boolean
}

/**
 * 사용자의 저장된 차트 목록 조회
 */
export async function getChartsByUser(userId: string): Promise<SavedChartSummary[]> {
  const supabase = createAdminClient()

  const { data: charts, error } = await supabase
    .from('myeongpan_charts')
    .select('id, place_name, gender, created_at, chart')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    logger.error('Failed to fetch charts', { error: error.message, userId })
    throw new Error(`차트 목록 조회 실패: ${error.message}`)
  }
  if (!charts) return []

  // interpretation 존재 여부 조회
  const chartIds = charts.map((c) => c.id)
  const { data: interps } = await supabase
    .from('myeongpan_interpretations')
    .select('chart_id')
    .in('chart_id', chartIds)

  const interpSet = new Set((interps ?? []).map((i) => i.chart_id))

  return charts.map((c) => {
    const chart = c.chart as unknown as UnifiedChart
    return {
      id: c.id,
      placeName: c.place_name,
      gender: c.gender,
      createdAt: c.created_at,
      systemsCompleted: chart?.meta?.systemsCompleted ?? [],
      hasInterpretation: interpSet.has(c.id),
    }
  })
}

/**
 * 차트 상세 + 최신 interpretation 조회
 */
export async function getChartWithInterpretation(
  chartId: string,
  userId: string
): Promise<{
  chart: UnifiedChart
  profile: BirthProfile
  interpretation: InterpretationResult | null
} | null> {
  const supabase = createAdminClient()

  const { data: chartRow, error: chartError } = await supabase
    .from('myeongpan_charts')
    .select('chart, birth_profile')
    .eq('id', chartId)
    .eq('user_id', userId)
    .single()

  if (chartError) {
    if (chartError.code === 'PGRST116') return null
    logger.error('DB error in getChartWithInterpretation', { error: chartError.message, chartId })
    throw new Error(`차트 조회 오류: ${chartError.message}`)
  }
  if (!chartRow) return null

  // 최신 interpretation
  const { data: interpRow } = await supabase
    .from('myeongpan_interpretations')
    .select('interpretation')
    .eq('chart_id', chartId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    chart: chartRow.chart as unknown as UnifiedChart,
    profile: chartRow.birth_profile as unknown as BirthProfile,
    interpretation: interpRow
      ? (interpRow.interpretation as unknown as InterpretationResult)
      : null,
  }
}

/**
 * 차트 삭제 (interpretations는 CASCADE)
 */
export async function deleteChart(chartId: string, userId: string): Promise<void> {
  const supabase = createAdminClient()

  // interpretations 먼저 삭제 (CASCADE 없을 수 있으므로 안전하게)
  await supabase
    .from('myeongpan_interpretations')
    .delete()
    .eq('chart_id', chartId)
    .eq('user_id', userId)

  const { error } = await supabase
    .from('myeongpan_charts')
    .delete()
    .eq('id', chartId)
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to delete chart', { error: error.message, chartId })
    throw new Error(`차트 삭제 실패: ${error.message}`)
  }

  logger.info('Chart deleted', { chartId, userId })
}

// ============================================================
// Service Status
// ============================================================

export function isMyeongpanServiceAvailable(): boolean {
  return !!GEMINI_API_KEY
}

export function getMyeongpanServiceProvider(): string {
  return IS_MOCK ? 'mock' : 'gemini'
}
