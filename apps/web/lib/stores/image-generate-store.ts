import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AspectRatio, ImageResolution } from '@/lib/services/types'
import { getModelConstraints } from '@/lib/models/helpers'
import { toast } from 'sonner'

// ============================================================
// Constraint Helpers
// ============================================================

const GLOBAL_MAX_REFS = 14

const ALL_RESOLUTIONS: ImageResolution[] = ['1K', '2K', '4K']
const ALL_ASPECT_RATIOS: AspectRatio[] = [
  '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '21:9',
]

function getMaxRefImages(modelId: string): number {
  return getModelConstraints(modelId)?.maxRefImages ?? GLOBAL_MAX_REFS
}

function getAllowedResolutions(modelId: string): ImageResolution[] {
  const c = getModelConstraints(modelId)
  return (c?.resolutions ?? ALL_RESOLUTIONS) as ImageResolution[]
}

function getAllowedAspectRatios(modelId: string): AspectRatio[] {
  const c = getModelConstraints(modelId)
  return (c?.aspectRatios ?? ALL_ASPECT_RATIOS) as AspectRatio[]
}

/** Store 외부에서 모델 제약 정보를 가져오는 유틸 */
export function getStoreConstraints(model: string) {
  return {
    maxRefImages: getMaxRefImages(model),
    allowedResolutions: getAllowedResolutions(model),
    allowedAspectRatios: getAllowedAspectRatios(model),
  }
}

// ============================================================
// Types
// ============================================================

interface ImageGenerateState {
  // Settings (persisted)
  model: string
  aspectRatio: AspectRatio
  resolution: ImageResolution
  count: number

  // Prompt (NOT persisted — File is not serializable)
  prompt: string
  referenceFiles: File[]
  referencePreviewUrls: string[]

  // Generation state (NOT persisted)
  isGenerating: boolean
  pendingCount: number
  lastGeneratedAt: number | null
  error: string | null
}

interface ImageGenerateActions {
  setPrompt: (prompt: string) => void
  setModel: (model: string) => void
  setAspectRatio: (ratio: AspectRatio) => void
  setResolution: (resolution: ImageResolution) => void
  setCount: (count: number) => void
  addReferenceFile: (file: File) => void
  removeReferenceFile: (index: number) => void
  clearReferences: () => void
  generate: () => Promise<void>
}

// ============================================================
// Constants
// ============================================================

// /image 페이지 전용 기본값 — 전역 default(nano-banana-pro)와 의도적 분리
const DEFAULT_T2I_MODEL = 'fal-ai/flux-2-pro'
const DEFAULT_I2I_MODEL = 'fal-ai/flux-2-pro/edit'

// ============================================================
// Store
// ============================================================

export const useImageGenerateStore = create<ImageGenerateState & ImageGenerateActions>()(
  persist(
    (set, get) => ({
      // Default settings
      model: DEFAULT_T2I_MODEL,
      aspectRatio: '1:1',
      resolution: '2K',
      count: 1,

      // Prompt
      prompt: '',
      referenceFiles: [],
      referencePreviewUrls: [],

      // Generation state
      isGenerating: false,
      pendingCount: 0,
      lastGeneratedAt: null,
      error: null,

      // Actions
      setPrompt: (prompt) => set({ prompt }),

      setModel: (model) => {
        const state = get()
        const updates: Partial<ImageGenerateState> = { model }
        const constraints = getModelConstraints(model)

        // 1) 참조 이미지 초과분 제거 + URL revoke
        const maxRefs = constraints?.maxRefImages ?? GLOBAL_MAX_REFS
        let trimmed = false
        if (state.referenceFiles.length > maxRefs) {
          const excessUrls = state.referencePreviewUrls.slice(maxRefs)
          updates.referenceFiles = state.referenceFiles.slice(0, maxRefs)
          updates.referencePreviewUrls = state.referencePreviewUrls.slice(0, maxRefs)
          trimmed = true
          // Revoke after state update to avoid stale references
          queueMicrotask(() => {
            for (const url of excessUrls) URL.revokeObjectURL(url)
          })
        }

        // 2) 해상도 교정
        const allowedRes = getAllowedResolutions(model)
        if (!allowedRes.includes(state.resolution)) {
          updates.resolution = allowedRes[0]!
        }

        // 3) 비율 교정
        const allowedRatios = getAllowedAspectRatios(model)
        if (!allowedRatios.includes(state.aspectRatio)) {
          updates.aspectRatio = allowedRatios[0]!
        }

        set(updates)

        if (trimmed) {
          toast.warning(`참조 이미지를 ${maxRefs}장으로 줄였습니다`)
        }
      },

      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      setResolution: (resolution) => set({ resolution }),
      setCount: (count) => set({ count: Math.max(1, Math.min(4, count)) }),

      addReferenceFile: (file) => {
        const state = get()

        // constraints 검증: I2I 모델의 maxRefImages 확인
        const i2iModel = state.referenceFiles.length === 0
          ? DEFAULT_I2I_MODEL
          : state.model
        const maxRefs = getMaxRefImages(i2iModel)
        if (state.referenceFiles.length >= maxRefs) {
          toast.warning(`이 모델은 최대 ${maxRefs}장의 참조 이미지를 지원합니다`)
          return
        }

        const url = URL.createObjectURL(file)
        const newFiles = [...state.referenceFiles, file]
        const newUrls = [...state.referencePreviewUrls, url]
        const updates: Partial<ImageGenerateState> = {
          referenceFiles: newFiles,
          referencePreviewUrls: newUrls,
        }
        // Auto-switch to image-to-image model when first reference added
        if (state.referenceFiles.length === 0) {
          updates.model = DEFAULT_I2I_MODEL
        }
        set(updates)
      },

      removeReferenceFile: (index) => {
        const state = get()
        const url = state.referencePreviewUrls[index]
        if (url) URL.revokeObjectURL(url)

        const newFiles = state.referenceFiles.filter((_, i) => i !== index)
        const newUrls = state.referencePreviewUrls.filter((_, i) => i !== index)
        const updates: Partial<ImageGenerateState> = {
          referenceFiles: newFiles,
          referencePreviewUrls: newUrls,
        }
        // Restore text-to-image model when all references removed
        if (newFiles.length === 0) {
          updates.model = DEFAULT_T2I_MODEL
        }
        set(updates)
      },

      clearReferences: () => {
        const state = get()
        for (const url of state.referencePreviewUrls) {
          URL.revokeObjectURL(url)
        }
        set({
          referenceFiles: [],
          referencePreviewUrls: [],
          model: DEFAULT_T2I_MODEL,
        })
      },

      generate: async () => {
        const state = get()
        if (!state.prompt.trim()) return
        if (state.isGenerating) return

        set({ isGenerating: true, pendingCount: state.count, error: null })

        try {
          let referenceUrls: string[] | undefined

          // Upload reference images first if present
          if (state.referenceFiles.length > 0) {
            const formData = new FormData()
            for (const file of state.referenceFiles) {
              formData.append('files', file)
            }
            const uploadRes = await fetch('/api/image/upload', {
              method: 'POST',
              body: formData,
            })
            const uploadJson = await uploadRes.json()
            if (!uploadRes.ok || !uploadJson.success) {
              throw new Error(uploadJson.error?.message || '참조 이미지 업로드에 실패했습니다')
            }
            referenceUrls = uploadJson.data.urls
          }

          // Generate images
          const res = await fetch('/api/image/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: state.prompt.trim(),
              aspectRatio: state.aspectRatio,
              resolution: state.resolution,
              model: state.model,
              count: state.count,
              referenceUrls,
            }),
          })
          const json = await res.json()
          if (!res.ok || !json.success) {
            throw new Error(json.error?.message || '이미지 생성에 실패했습니다')
          }

          const results = json.data.results as Array<{ success: boolean; error?: string }>
          const successCount = results.filter(r => r.success).length
          const failCount = results.filter(r => !r.success).length

          if (failCount > 0 && successCount > 0) {
            toast.warning(`${successCount}장 생성, ${failCount}장 실패`)
          } else if (failCount > 0 && successCount === 0) {
            throw new Error('모든 이미지 생성에 실패했습니다')
          }

          set({
            lastGeneratedAt: Date.now(),
            pendingCount: 0,
            prompt: '',
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : '이미지 생성 중 오류가 발생했습니다'
          set({ error: message, pendingCount: 0 })
          toast.error(message)
        } finally {
          set({ isGenerating: false })
        }
      },
    }),
    {
      name: 'image-generate-settings',
      partialize: (state) => ({
        model: state.model,
        aspectRatio: state.aspectRatio,
        resolution: state.resolution,
        count: state.count,
      }),
    },
  ),
)
