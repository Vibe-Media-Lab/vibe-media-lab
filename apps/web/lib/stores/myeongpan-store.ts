import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import type {
  UnifiedChart,
  InterpretationResult,
  InterpretationTopic,
} from '@vibe-media-lab/myeongpan-core'
import { guessDefaultCity, type CityEntry } from '@/lib/constants/city-data'
import type { SavedChartSummary } from '@/lib/services/myeongpan-service'
import { ALLOWED_LLM_MODELS, LLM_MODELS } from '@/lib/constants/model-options'

// 강타입 (localStorage 오염 방지)
type LlmModelId = (typeof ALLOWED_LLM_MODELS)[number]
const DEFAULT_LLM_MODEL: LlmModelId = (LLM_MODELS.defaultModelId || 'gemini-2.5-flash') as LlmModelId

// ============================================================
// Types
// ============================================================

export type Phase = 'form' | 'loading' | 'result' | 'error'
export type LoadingStep = 'calculating' | 'interpreting'

interface MyeongpanState {
  // Phase
  phase: Phase
  loadingStep: LoadingStep | null

  // Birth (NOT persisted)
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number
  birthMinute: number
  unknownTime: boolean
  gender: 'male' | 'female'
  calendarMode: 'solar' | 'lunar'
  isLeapMonth: boolean

  // Place (NOT persisted)
  placeId: string
  placeName: string
  timezone: string
  lat: number
  lon: number

  // Options (persisted)
  tone: 'warm' | 'neutral' | 'professional'
  length: 'short' | 'medium' | 'long'
  topics: InterpretationTopic[]
  houseSystem: 'placidus' | 'koch' | 'equal' | 'whole-sign'
  llmModel: LlmModelId

  // Results (NOT persisted)
  chartId: string | null
  chart: UnifiedChart | null
  interpretation: InterpretationResult | null
  error: string | null

  // History
  savedCharts: SavedChartSummary[] | null
}

interface MyeongpanActions {
  // Form setters
  setBirthYear: (v: number) => void
  setBirthMonth: (v: number) => void
  setBirthDay: (v: number) => void
  setBirthHour: (v: number) => void
  setBirthMinute: (v: number) => void
  setUnknownTime: (v: boolean) => void
  setGender: (v: 'male' | 'female') => void
  setCalendarMode: (v: 'solar' | 'lunar') => void
  setIsLeapMonth: (v: boolean) => void
  setPlace: (city: CityEntry) => void
  setTone: (v: 'warm' | 'neutral' | 'professional') => void
  setLength: (v: 'short' | 'medium' | 'long') => void
  setTopics: (v: InterpretationTopic[]) => void
  setHouseSystem: (v: 'placidus' | 'koch' | 'equal' | 'whole-sign') => void
  setLlmModel: (v: LlmModelId) => void

  // Actions
  submit: () => Promise<void>
  reinterpret: () => Promise<void>
  loadChart: (chartId: string) => Promise<void>
  loadSavedCharts: () => Promise<void>
  deleteChart: (chartId: string) => Promise<void>
  reset: () => void
}

// ============================================================
// Helpers
// ============================================================

function buildBirthProfile(state: MyeongpanState) {
  const pad = (n: number) => String(n).padStart(2, '0')

  const dateStr = `${state.birthYear}-${pad(state.birthMonth)}-${pad(state.birthDay)}`
  const birthDateTimeLocal = state.unknownTime
    ? dateStr
    : `${dateStr}T${pad(state.birthHour)}:${pad(state.birthMinute)}`

  return {
    birthDateTimeLocal,
    timezone: state.timezone,
    location: {
      lat: state.lat,
      lon: state.lon,
      placeName: state.placeName,
    },
    calendarMode: state.calendarMode,
    isLeapMonth: state.isLeapMonth,
    gender: state.gender,
    unknownTime: state.unknownTime,
    config: {
      western: { houseSystem: state.houseSystem },
    },
  }
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) {
    const msg = json?.error?.message || json?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json.data ?? json
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok) {
    const msg = json?.error?.message || json?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json.data ?? json
}

async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) {
    const json = await res.json()
    const msg = json?.error?.message || json?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
}

// ============================================================
// Default state
// ============================================================

const FALLBACK_CITY = {
  id: 'kr-seoul', name: '서울특별시', timezone: 'Asia/Seoul', lat: 37.5665, lon: 126.978,
}

function createDefaultState(): MyeongpanState {
  const defaultCity = typeof window !== 'undefined' ? guessDefaultCity() : FALLBACK_CITY
  return {
    phase: 'form',
    loadingStep: null,

    birthYear: new Date().getFullYear() - 30,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthMinute: 0,
    unknownTime: false,
    gender: 'male',
    calendarMode: 'solar',
    isLeapMonth: false,

    placeId: defaultCity.id,
    placeName: defaultCity.name,
    timezone: defaultCity.timezone,
    lat: defaultCity.lat,
    lon: defaultCity.lon,

    tone: 'warm',
    length: 'medium',
    topics: [],
    houseSystem: 'placidus',
    llmModel: DEFAULT_LLM_MODEL,

    chartId: null,
    chart: null,
    interpretation: null,
    error: null,

    savedCharts: null,
  }
}

// ============================================================
// Store
// ============================================================

export const useMyeongpanStore = create<MyeongpanState & MyeongpanActions>()(
  persist(
    (set, get) => ({
      ...createDefaultState(),

      // --- Form setters ---
      setBirthYear: (v) => set({ birthYear: v }),
      setBirthMonth: (v) => set({ birthMonth: v }),
      setBirthDay: (v) => set({ birthDay: v }),
      setBirthHour: (v) => set({ birthHour: v }),
      setBirthMinute: (v) => set({ birthMinute: v }),
      setUnknownTime: (v) => set({ unknownTime: v }),
      setGender: (v) => set({ gender: v }),
      setCalendarMode: (v) => set({ calendarMode: v }),
      setIsLeapMonth: (v) => set({ isLeapMonth: v }),
      setPlace: (city) =>
        set({
          placeId: city.id,
          placeName: city.name,
          timezone: city.timezone,
          lat: city.lat,
          lon: city.lon,
        }),
      setTone: (v) => set({ tone: v }),
      setLength: (v) => set({ length: v }),
      setTopics: (v) => set({ topics: v }),
      setHouseSystem: (v) => set({ houseSystem: v }),
      setLlmModel: (v) => set({ llmModel: v }),

      // --- Submit ---
      submit: async () => {
        const state = get()
        set({ phase: 'loading', loadingStep: 'calculating', error: null })

        try {
          // 1. Calculate
          const profile = buildBirthProfile(state)
          const calcResult = await apiPost<{ chartId: string; chart: UnifiedChart }>(
            '/api/myeongpan/calculate',
            profile
          )
          set({
            chartId: calcResult.chartId,
            chart: calcResult.chart,
            loadingStep: 'interpreting',
          })

          // 2. Interpret
          try {
            const options: Record<string, unknown> = {
              tone: state.tone,
              length: state.length,
            }
            if (state.topics.length > 0) {
              options.topics = state.topics
            }
            const interpretation = await apiPost<InterpretationResult>(
              '/api/myeongpan/interpret',
              { chartId: calcResult.chartId, model: state.llmModel, options }
            )
            set({ interpretation, phase: 'result', loadingStep: null })
          } catch (_interpError) {
            // 풀이 실패 → 차트만 표시
            set({ phase: 'result', loadingStep: null })
            toast.error('풀이 생성에 실패했습니다. "다시 풀이" 버튼으로 재시도할 수 있습니다.')
          }
        } catch (calcError) {
          const msg = calcError instanceof Error ? calcError.message : '차트 계산 실패'
          set({ phase: 'error', loadingStep: null, error: msg })
          toast.error(msg)
        }
      },

      // --- Reinterpret ---
      reinterpret: async () => {
        const state = get()
        if (!state.chartId) return

        set({ loadingStep: 'interpreting' })

        try {
          const options: Record<string, unknown> = {
            tone: state.tone,
            length: state.length,
          }
          if (state.topics.length > 0) {
            options.topics = state.topics
          }
          const interpretation = await apiPost<InterpretationResult>(
            '/api/myeongpan/interpret',
            { chartId: state.chartId, model: state.llmModel, options }
          )
          set({ interpretation, loadingStep: null })
          toast.success('풀이가 갱신되었습니다.')
        } catch (_error) {
          set({ loadingStep: null })
          toast.error('풀이 재생성에 실패했습니다.')
        }
      },

      // --- Load saved chart ---
      loadChart: async (chartId) => {
        set({ phase: 'loading', loadingStep: 'calculating', error: null })

        try {
          const data = await apiGet<{
            chart: UnifiedChart
            profile: Record<string, unknown>
            interpretation: InterpretationResult | null
          }>(`/api/myeongpan/charts/${chartId}`)

          set({
            chartId,
            chart: data.chart,
            interpretation: data.interpretation,
            phase: 'result',
            loadingStep: null,
          })
        } catch (_error) {
          set({ phase: 'form', loadingStep: null })
          toast.error('차트를 불러올 수 없습니다.')
        }
      },

      // --- Load saved charts list ---
      loadSavedCharts: async () => {
        try {
          const charts = await apiGet<SavedChartSummary[]>('/api/myeongpan/charts')
          set({ savedCharts: charts })
        } catch {
          // 로그인 안 된 경우 등 — 무시
        }
      },

      // --- Delete chart ---
      deleteChart: async (chartId) => {
        try {
          await apiDelete(`/api/myeongpan/charts/${chartId}`)
          const current = get().savedCharts
          if (current) {
            set({ savedCharts: current.filter((c) => c.id !== chartId) })
          }
          toast.success('삭제되었습니다.')
        } catch {
          toast.error('삭제에 실패했습니다.')
        }
      },

      // --- Reset ---
      reset: () => {
        const { tone, length, topics, houseSystem, llmModel } = get()
        set({
          ...createDefaultState(),
          tone,
          length,
          topics,
          houseSystem,
          llmModel,
        })
      },
    }),
    {
      name: 'myeongpan-options',
      partialize: (state) => ({
        tone: state.tone,
        length: state.length,
        topics: state.topics,
        houseSystem: state.houseSystem,
        llmModel: state.llmModel,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<MyeongpanState>
        // localStorage 오염 방지: allowlist에 없는 llmModel은 default로 교정
        const llmModel = (ALLOWED_LLM_MODELS as readonly string[]).includes(p.llmModel ?? '')
          ? (p.llmModel as LlmModelId)
          : DEFAULT_LLM_MODEL
        return { ...current, ...p, llmModel }
      },
    }
  )
)
