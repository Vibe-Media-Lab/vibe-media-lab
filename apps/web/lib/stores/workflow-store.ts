import { create } from 'zustand'
import type { WorkflowStep, MediaType } from '@vibe-media-lab/shared'

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
    set((state) => ({
      stepData: {
        ...state.stepData,
        [stepId]: data,
      },
    }))
  },

  goToStep: (index) => {
    const { steps } = get()
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index })
    }
  },

  nextStep: () => {
    const { currentStepIndex, steps } = get()
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 })
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get()
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 })
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
    set({ status: 'completed' })
  },

  reset: () => {
    set(initialState)
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
