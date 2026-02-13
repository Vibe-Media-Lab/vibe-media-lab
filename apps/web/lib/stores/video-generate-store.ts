import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getModelConstraints } from '@/lib/models/helpers'
import { toast } from 'sonner'

// ============================================================
// Constraint Helpers
// ============================================================

const ALL_ASPECT_RATIOS = [
  '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '21:9',
]

const ALL_DURATIONS = ['5', '8', '10']

function getAllowedDurations(modelId: string): string[] {
  const c = getModelConstraints(modelId)
  return c?.durations ?? ALL_DURATIONS
}

function getAllowedAspectRatios(modelId: string): string[] {
  const c = getModelConstraints(modelId)
  return (c?.aspectRatios ?? ALL_ASPECT_RATIOS) as string[]
}

function getAllowedVideoResolutions(modelId: string): string[] {
  const c = getModelConstraints(modelId)
  return c?.videoResolutions ?? []
}

/** Store 외부에서 모델 제약 정보를 가져오는 유틸 */
export function getVideoStoreConstraints(model: string) {
  const c = getModelConstraints(model)
  return {
    allowedDurations: getAllowedDurations(model),
    allowedAspectRatios: getAllowedAspectRatios(model),
    allowedVideoResolutions: getAllowedVideoResolutions(model),
    supportsSound: c?.supportsSound ?? false,
    supportsEndFrame: c?.supportsEndFrame ?? false,
  }
}

// ============================================================
// Types
// ============================================================

type VideoMode = 'text-to-video' | 'image-to-video'

interface VideoGenerateState {
  // Settings (persisted)
  model: string
  aspectRatio: string
  duration: string
  resolution: string
  sound: boolean
  mode: VideoMode

  // Prompt (NOT persisted)
  prompt: string
  imageFile: File | null
  imagePreviewUrl: string | null
  endImageFile: File | null
  endImagePreviewUrl: string | null

  // Generation state (NOT persisted)
  isGenerating: boolean
  lastGeneratedAt: number | null
  error: string | null
}

interface VideoGenerateActions {
  setPrompt: (prompt: string) => void
  setModel: (model: string) => void
  setAspectRatio: (ratio: string) => void
  setDuration: (duration: string) => void
  setResolution: (resolution: string) => void
  setSound: (sound: boolean) => void
  setMode: (mode: VideoMode) => void
  setImageFile: (file: File | null) => void
  clearImage: () => void
  setEndImageFile: (file: File | null) => void
  clearEndImage: () => void
  generate: () => Promise<void>
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_I2V_MODEL = 'kling-2.6/image-to-video'
const DEFAULT_T2V_MODEL = 'kling-2.6/text-to-video'

// ============================================================
// Store
// ============================================================

export const useVideoGenerateStore = create<VideoGenerateState & VideoGenerateActions>()(
  persist(
    (set, get) => ({
      // Default settings
      model: DEFAULT_T2V_MODEL,
      aspectRatio: '16:9',
      duration: '5',
      resolution: '720p',
      sound: false,
      mode: 'text-to-video' as VideoMode,

      // Prompt
      prompt: '',
      imageFile: null,
      imagePreviewUrl: null,
      endImageFile: null,
      endImagePreviewUrl: null,

      // Generation state
      isGenerating: false,
      lastGeneratedAt: null,
      error: null,

      // Actions
      setPrompt: (prompt) => set({ prompt }),

      setModel: (model) => {
        const state = get()
        const updates: Partial<VideoGenerateState> = { model }

        // Duration 교정
        const allowedDurations = getAllowedDurations(model)
        if (!allowedDurations.includes(state.duration)) {
          updates.duration = allowedDurations[0]!
        }

        // Aspect ratio 교정 — 빈 배열(미지원)이면 교정 불필요
        const allowedRatios = getAllowedAspectRatios(model)
        if (allowedRatios.length > 0 && !allowedRatios.includes(state.aspectRatio)) {
          updates.aspectRatio = allowedRatios[0]!
        }

        // Resolution 교정 — 빈 배열(미지원)이면 교정 불필요
        const allowedRes = getAllowedVideoResolutions(model)
        if (allowedRes.length > 0 && !allowedRes.includes(state.resolution)) {
          updates.resolution = allowedRes[0]!
        }

        // End frame 미지원 모델 → queueMicrotask로 revoke (React 렌더링 안전)
        const c = getModelConstraints(model)
        if (!c?.supportsEndFrame && state.endImagePreviewUrl) {
          const urlToRevoke = state.endImagePreviewUrl
          queueMicrotask(() => URL.revokeObjectURL(urlToRevoke))
          updates.endImageFile = null
          updates.endImagePreviewUrl = null
        }

        set(updates)
      },

      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      setDuration: (duration) => set({ duration }),
      setResolution: (resolution) => set({ resolution }),
      setSound: (sound) => set({ sound }),

      setMode: (mode) => {
        const state = get()
        const updates: Partial<VideoGenerateState> = { mode }

        // 모드 전환 시 기본 모델 설정
        if (mode === 'text-to-video' && state.mode !== 'text-to-video') {
          updates.model = DEFAULT_T2V_MODEL
        } else if (mode === 'image-to-video' && state.mode !== 'image-to-video') {
          updates.model = DEFAULT_I2V_MODEL
        }

        set(updates)
      },

      setImageFile: (file) => {
        const state = get()
        // 기존 preview URL revoke
        if (state.imagePreviewUrl) {
          URL.revokeObjectURL(state.imagePreviewUrl)
        }

        if (file) {
          const url = URL.createObjectURL(file)
          set({
            imageFile: file,
            imagePreviewUrl: url,
            mode: 'image-to-video',
            model: state.mode === 'image-to-video' ? state.model : DEFAULT_I2V_MODEL,
          })
        } else {
          set({
            imageFile: null,
            imagePreviewUrl: null,
          })
        }
      },

      clearImage: () => {
        const state = get()
        if (state.imagePreviewUrl) {
          URL.revokeObjectURL(state.imagePreviewUrl)
        }
        // End frame도 함께 정리
        if (state.endImagePreviewUrl) {
          URL.revokeObjectURL(state.endImagePreviewUrl)
        }
        set({
          imageFile: null,
          imagePreviewUrl: null,
          endImageFile: null,
          endImagePreviewUrl: null,
          mode: 'text-to-video',
          model: DEFAULT_T2V_MODEL,
        })
      },

      setEndImageFile: (file) => {
        const state = get()
        if (state.endImagePreviewUrl) URL.revokeObjectURL(state.endImagePreviewUrl)
        if (file) {
          set({ endImageFile: file, endImagePreviewUrl: URL.createObjectURL(file) })
        } else {
          set({ endImageFile: null, endImagePreviewUrl: null })
        }
      },

      clearEndImage: () => {
        const state = get()
        if (state.endImagePreviewUrl) URL.revokeObjectURL(state.endImagePreviewUrl)
        set({ endImageFile: null, endImagePreviewUrl: null })
      },

      generate: async () => {
        const state = get()
        if (!state.prompt.trim()) return
        if (state.isGenerating) return

        set({ isGenerating: true, error: null })

        try {
          let imageUrl: string | undefined

          // I2V 모드: 이미지 업로드
          if (state.mode === 'image-to-video' && state.imageFile) {
            const formData = new FormData()
            formData.append('files', state.imageFile)
            const uploadRes = await fetch('/api/image/upload', {
              method: 'POST',
              body: formData,
            })
            const uploadJson = await uploadRes.json()
            if (!uploadRes.ok || !uploadJson.success) {
              throw new Error(uploadJson.error?.message || '이미지 업로드에 실패했습니다')
            }
            imageUrl = uploadJson.data.urls[0]
          }

          // End frame 업로드 (별도 try/catch — 실패해도 생성 진행)
          let tailImageUrl: string | undefined
          if (state.mode === 'image-to-video' && state.endImageFile) {
            try {
              const endFormData = new FormData()
              endFormData.append('files', state.endImageFile)
              const endUploadRes = await fetch('/api/image/upload', {
                method: 'POST',
                body: endFormData,
              })
              if (endUploadRes.ok) {
                const endUploadJson = await endUploadRes.json()
                if (endUploadJson.success) {
                  tailImageUrl = endUploadJson.data.urls[0]
                }
              }
            } catch {
              // End frame 업로드 실패 → 무시 (선택사항)
            }
          }

          const res = await fetch('/api/video/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: state.prompt.trim(),
              model: state.model,
              duration: state.duration,
              aspectRatio: state.aspectRatio,
              resolution: state.resolution,
              sound: state.sound,
              ...(imageUrl ? { imageUrl } : {}),
              ...(tailImageUrl ? { tailImageUrl } : {}),
            }),
          })
          const json = await res.json()
          if (!res.ok || !json.success) {
            throw new Error(json.error?.message || '비디오 생성에 실패했습니다')
          }

          set({
            lastGeneratedAt: Date.now(),
            prompt: '',
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : '비디오 생성 중 오류가 발생했습니다'
          set({ error: message })
          toast.error(message)
        } finally {
          set({ isGenerating: false })
        }
      },
    }),
    {
      name: 'video-generate-settings',
      partialize: (state) => ({
        model: state.model,
        aspectRatio: state.aspectRatio,
        duration: state.duration,
        resolution: state.resolution,
        sound: state.sound,
        mode: state.mode,
      }),
    },
  ),
)
