'use client'

import { useState, useCallback } from 'react'

export type GenerationMode = 'auto' | 'manual'

const STORAGE_PREFIX = 'vibe-mode-'
const DEFAULT_MODE: GenerationMode = 'manual'

function getStoredMode(stepKey: string): GenerationMode {
  if (typeof window === 'undefined') return DEFAULT_MODE
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${stepKey}`)
    if (stored === 'auto' || stored === 'manual') return stored
  } catch {
    // Private browsing or storage quota exceeded
  }
  return DEFAULT_MODE
}

/**
 * 자동/수동 모드 토글 훅
 *
 * stepKey별로 localStorage에 저장 (예: 'kids/videos', 'kids/audio')
 * 기본값: 'manual' (kieai 크레딧 소진 상태)
 */
export function useGenerationMode(stepKey: string): [GenerationMode, (mode: GenerationMode) => void] {
  const [mode, setModeState] = useState<GenerationMode>(() => getStoredMode(stepKey))

  const setMode = useCallback((newMode: GenerationMode) => {
    setModeState(newMode)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${stepKey}`, newMode)
      } catch {
        // Private browsing or storage quota exceeded
      }
    }
  }, [stepKey])

  return [mode, setMode]
}
