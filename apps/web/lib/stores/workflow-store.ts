import { create } from 'zustand'
import type { WorkflowStep, MediaType } from '@vibe-media-lab/shared'
import type { ModelCapability } from '@/lib/models/types'
import { ENABLED } from '@/lib/models/enabled'
import { getStepPolicy } from '@/lib/models/workflow-policies'

export type WorkflowStatus = 'idle' | 'in_progress' | 'generating' | 'completed' | 'failed'

export interface StepData {
  [stepId: string]: unknown
}

export interface GeneratedAsset {
  stepId: string
  mediaType: MediaType
  url: string
  createdAt: Date
}

interface WorkflowState {
  templateId: string | null
  steps: WorkflowStep[]
  currentStepIndex: number
  stepData: StepData
  status: WorkflowStatus
  generatedAssets: GeneratedAsset[]
  error: string | null
  outputUrl: string | null
  // Project persistence
  projectId: string | null
  sessionId: string | null
  isSaving: boolean
  lastSavedAt: Date | null
  isRestoring: boolean
  // Model selections
  modelSelections: Record<string, string>  // { 'shots': 'gemini-3-pro-image-preview', 'audio:secondary': 'V4_5' }
}

interface WorkflowActions {
  initWorkflow: (templateId: string, steps: WorkflowStep[]) => void
  setStepData: (stepId: string, data: unknown) => void
  goToStep: (index: number) => void
  nextStep: () => void
  prevStep: () => void
  startGeneration: () => void
  addGeneratedAsset: (asset: GeneratedAsset) => void
  setOutputUrl: (url: string) => void
  setError: (error: string) => void
  setCompleted: () => void
  reset: () => void
  // Project persistence actions
  setProjectId: (id: string | null) => void
  setSessionId: (id: string | null) => void
  saveProgress: () => Promise<void>
  loadProject: (projectId: string) => Promise<boolean>
  restoreFromProject: (projectData: {
    stepData: StepData
    currentStepIndex: number
    outputUrl: string | null
    status: string
  }) => void
  // Model selection actions
  setModelSelection: (key: string, modelId: string) => void
  getModelSelection: (key: string, defaultId: string) => string
}

const initialState: WorkflowState = {
  templateId: null,
  steps: [],
  currentStepIndex: 0,
  stepData: {},
  status: 'idle',
  generatedAssets: [],
  error: null,
  outputUrl: null,
  projectId: null,
  sessionId: null,
  isSaving: false,
  lastSavedAt: null,
  isRestoring: false,
  modelSelections: {},
}

const SAVE_DEBOUNCE_MS = 500

/** Pending debounce state — allows flush before page unload */
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingSaveState: WorkflowState | null = null

/**
 * Internal save function - saves current state to the server
 */
async function saveToServer(state: WorkflowState): Promise<boolean> {
  if (!state.projectId) {
    return false
  }

  try {
    const response = await fetch(`/api/projects/${state.projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentStepIndex: state.currentStepIndex,
        stepData: state.stepData,
        status: state.status === 'completed' ? 'completed' : 'in_progress',
        outputUrl: state.outputUrl,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save')
    }

    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Save failed'
    throw new Error(message)
  }
}

/**
 * Debounced save - schedules a save after SAVE_DEBOUNCE_MS.
 * Keeps pendingSaveState so flush can fire synchronously on beforeunload.
 */
function scheduleDebouncedSave(state: WorkflowState, setSaving: (saving: boolean) => void, setLastSaved: (date: Date) => void) {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }

  pendingSaveState = state

  saveDebounceTimer = setTimeout(async () => {
    pendingSaveState = null
    if (!state.projectId) return

    setSaving(true)
    try {
      await saveToServer(state)
      setLastSaved(new Date())
    } catch {
      // Silent fail for auto-save
    } finally {
      setSaving(false)
    }
  }, SAVE_DEBOUNCE_MS)
}

/**
 * Flush pending debounced save synchronously (best-effort via sendBeacon).
 * Called on beforeunload to prevent data loss.
 */
function flushPendingSave() {
  if (!pendingSaveState?.projectId) return

  const state = pendingSaveState
  pendingSaveState = null
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }

  const payload = JSON.stringify({
    currentStepIndex: state.currentStepIndex,
    stepData: state.stepData,
    status: state.status === 'completed' ? 'completed' : 'in_progress',
    outputUrl: state.outputUrl,
  })

  // sendBeacon is fire-and-forget, works on page unload
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(
      `/api/projects/${state.projectId}`,
      new Blob([payload], { type: 'application/json' }),
    )
  }
}

// Register beforeunload handler (client-side only)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingSave)
}

export const useWorkflowStore = create<WorkflowState & WorkflowActions>((set, get) => ({
  ...initialState,

  initWorkflow: (templateId, steps) => {
    set({
      ...initialState,
      templateId,
      steps,
      status: 'in_progress',
    })
  },

  setStepData: (stepId, data) => {
    set((state) => {
      const newState = {
        ...state,
        stepData: {
          ...state.stepData,
          [stepId]: data,
        },
      }

      // Schedule debounced save
      if (state.projectId) {
        scheduleDebouncedSave(
          { ...newState },
          (saving) => set({ isSaving: saving }),
          (date) => set({ lastSavedAt: date })
        )
      }

      return { stepData: newState.stepData }
    })
  },

  goToStep: (index) => {
    const { steps, projectId } = get()
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index })

      // Immediate save on step change
      if (projectId) {
        const state = get()
        set({ isSaving: true })
        saveToServer(state)
          .then(() => set({ lastSavedAt: new Date() }))
          .catch(() => {})
          .finally(() => set({ isSaving: false }))
      }
    }
  },

  nextStep: () => {
    const { currentStepIndex, steps, projectId } = get()
    if (currentStepIndex < steps.length - 1) {
      const newIndex = currentStepIndex + 1
      set({ currentStepIndex: newIndex })

      // Immediate save on step change
      if (projectId) {
        const state = get()
        set({ isSaving: true })
        saveToServer(state)
          .then(() => set({ lastSavedAt: new Date() }))
          .catch(() => {})
          .finally(() => set({ isSaving: false }))
      }
    }
  },

  prevStep: () => {
    const { currentStepIndex, projectId } = get()
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1
      set({ currentStepIndex: newIndex })

      // Immediate save on step change
      if (projectId) {
        const state = get()
        set({ isSaving: true })
        saveToServer(state)
          .then(() => set({ lastSavedAt: new Date() }))
          .catch(() => {})
          .finally(() => set({ isSaving: false }))
      }
    }
  },

  startGeneration: () => {
    set({ status: 'generating', error: null })
  },

  addGeneratedAsset: (asset) => {
    set((state) => ({
      generatedAssets: [...state.generatedAssets, asset],
    }))
  },

  setOutputUrl: (url) => {
    set({ outputUrl: url })
  },

  setError: (error) => {
    set({ status: 'failed', error })
  },

  setCompleted: () => {
    const { projectId } = get()
    set({ status: 'completed' })

    // Immediate save on completion
    if (projectId) {
      const state = get()
      set({ isSaving: true })
      saveToServer(state)
        .then(() => set({ lastSavedAt: new Date() }))
        .catch(() => {})
        .finally(() => set({ isSaving: false }))
    }
  },

  reset: () => {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer)
      saveDebounceTimer = null
    }
    pendingSaveState = null
    set(initialState)
  },

  // Project persistence actions
  setProjectId: (id) => {
    set({ projectId: id })
  },

  setSessionId: (id) => {
    set({ sessionId: id })
  },

  saveProgress: async () => {
    const state = get()
    if (!state.projectId) {
      return
    }

    set({ isSaving: true })
    try {
      await saveToServer(state)
      set({ lastSavedAt: new Date() })
    } finally {
      set({ isSaving: false })
    }
  },

  loadProject: async (projectId) => {
    set({ isRestoring: true })

    try {
      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        set({ isRestoring: false })
        return false
      }

      const data = await response.json()

      if (!data.success || !data.project) {
        set({ isRestoring: false })
        return false
      }

      const project = data.project
      const mappedStatus = project.status === 'completed' ? 'completed' : 'in_progress'

      set({
        projectId: project.id,
        templateId: project.templateId,
        stepData: project.stepData || {},
        currentStepIndex: project.currentStepIndex || 0,
        outputUrl: project.outputUrl,
        status: mappedStatus as WorkflowStatus,
        isRestoring: false,
      })

      return true
    } catch {
      set({ isRestoring: false })
      return false
    }
  },

  restoreFromProject: (projectData) => {
    const mappedStatus = projectData.status === 'completed' ? 'completed' : 'in_progress'
    const savedSelections = (projectData.stepData as Record<string, unknown>)?.__modelSelections as Record<string, string> | undefined
    const { templateId } = get()
    const normalizedSelections = savedSelections
      ? migrateModelSelections(savedSelections, templateId ?? undefined)
      : {}

    set({
      stepData: projectData.stepData || {},
      currentStepIndex: projectData.currentStepIndex || 0,
      outputUrl: projectData.outputUrl,
      status: mappedStatus as WorkflowStatus,
      isRestoring: false,
      modelSelections: normalizedSelections,
    })
  },

  // Model selection actions
  setModelSelection: (key, modelId) => {
    set((state) => {
      const newSelections = { ...state.modelSelections, [key]: modelId }
      const newStepData = {
        ...state.stepData,
        __modelSelections: newSelections,
      }

      if (state.projectId) {
        scheduleDebouncedSave(
          { ...state, stepData: newStepData },
          (saving) => set({ isSaving: saving }),
          (date) => set({ lastSavedAt: date })
        )
      }

      return { modelSelections: newSelections, stepData: newStepData }
    })
  },

  getModelSelection: (key, defaultId) => {
    return get().modelSelections[key] || defaultId
  },
}))

export function isStepComplete(stepData: StepData, step: WorkflowStep): boolean {
  const data = stepData[step.id]

  if (!step.required) {
    return true
  }

  if (data === undefined || data === null) {
    return false
  }

  if (typeof data === 'string' && data.trim() === '') {
    return false
  }

  if (Array.isArray(data) && data.length === 0) {
    return false
  }

  // image-select 스텝: selectedImageId 필수
  if (step.type === 'generation-review') {
    const config = step.config as import('@vibe-media-lab/shared').GenerationReviewStepConfig
    if (config.previewType === 'image-select') {
      const result = data as { selectedImageId?: string }
      if (!result?.selectedImageId) return false
    }
  }

  return true
}

export function canProceedToNext(stepData: StepData, steps: WorkflowStep[], currentIndex: number): boolean {
  const currentStep = steps[currentIndex]
  if (!currentStep) return false
  return isStepComplete(stepData, currentStep)
}

export function getWorkflowProgress(stepData: StepData, steps: WorkflowStep[]): number {
  if (steps.length === 0) return 0
  const completedCount = steps.filter((step) => isStepComplete(stepData, step)).length
  return Math.round((completedCount / steps.length) * 100)
}

// ============================================================
// Model Selection Migration
// ============================================================

/** 명시적 스텝키 → capability 매핑 (추론 없음) */
const STEP_CAPABILITY_MAP: Record<string, ModelCapability> = {
  'anchors':          'text-to-image',
  'expand':           'image-to-image',
  'shots':            'image-to-image',
  'videos':           'image-to-video',
  'audio':            'tts',
  'audio:secondary':  'bgm',
  'main-visual':      'text-to-image',
  'character-sheet':  'image-to-image',
}

/**
 * 저장된 모델 선택을 검증/마이그레이션
 *
 * workflowId가 있으면 워크플로우 정책 기준, 없으면 전역 enabled 기준.
 * 비허용 모델 → 해당 정책/capability의 기본값으로 교체.
 */
function migrateModelSelections(
  saved: Record<string, string>,
  workflowId?: string,
): Record<string, string> {
  const result = { ...saved }
  for (const [stepKey, modelId] of Object.entries(result)) {
    const capability = STEP_CAPABILITY_MAP[stepKey]
    if (!capability) continue

    // 워크플로우 정책이 있으면 정책 기준 마이그레이션
    if (workflowId) {
      const stepPolicy = getStepPolicy(workflowId, stepKey, capability)
      if (stepPolicy) {
        if (!stepPolicy.allowedModels.includes(modelId)) {
          result[stepKey] = stepPolicy.defaultModel
        }
        continue
      }
    }

    // 전역 fallback (워크플로우 정책 없는 스텝)
    const config = ENABLED[capability]
    if (config && !config.models.includes(modelId)) {
      result[stepKey] = config.defaultId
    }
  }
  return result
}
