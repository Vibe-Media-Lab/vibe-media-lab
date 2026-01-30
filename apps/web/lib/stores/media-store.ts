import { create } from 'zustand'

type MediaType = 'image' | 'video' | 'tts' | 'bgm'
type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed'

interface GenerationResult {
  id: string
  runId: string
  mediaType: MediaType
  prompt: string
  outputUrl?: string
  error?: string
  provider: string
  model: string
  createdAt: Date
}

interface MediaState {
  // Current generation
  currentMediaType: MediaType
  status: GenerationStatus
  error: string | null
  result: GenerationResult | null

  // Generation history (session)
  recentGenerations: GenerationResult[]

  // Actions
  setMediaType: (type: MediaType) => void
  startGeneration: () => void
  setResult: (result: GenerationResult) => void
  setError: (error: string) => void
  reset: () => void
  addToHistory: (result: GenerationResult) => void
}

export const useMediaStore = create<MediaState>((set) => ({
  currentMediaType: 'image',
  status: 'idle',
  error: null,
  result: null,
  recentGenerations: [],

  setMediaType: (type) =>
    set({
      currentMediaType: type,
      status: 'idle',
      error: null,
      result: null,
    }),

  startGeneration: () =>
    set({
      status: 'generating',
      error: null,
      result: null,
    }),

  setResult: (result) =>
    set((state) => ({
      status: 'completed',
      result,
      recentGenerations: [result, ...state.recentGenerations].slice(0, 10),
    })),

  setError: (error) =>
    set({
      status: 'failed',
      error,
    }),

  reset: () =>
    set({
      status: 'idle',
      error: null,
      result: null,
    }),

  addToHistory: (result) =>
    set((state) => ({
      recentGenerations: [result, ...state.recentGenerations].slice(0, 10),
    })),
}))
