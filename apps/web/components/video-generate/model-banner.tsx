'use client'

import * as React from 'react'
import { useVideoGenerateStore } from '@/lib/stores/video-generate-store'
import { getModelSelectionConfig } from '@/lib/models/helpers'

export function ModelBanner() {
  const model = useVideoGenerateStore(s => s.model)
  const mode = useVideoGenerateStore(s => s.mode)

  const capability = mode === 'image-to-video' ? 'image-to-video' : 'text-to-video'

  const config = React.useMemo(() => {
    try {
      return getModelSelectionConfig(capability)
    } catch {
      return { category: capability, options: [], defaultModelId: '' }
    }
  }, [capability])

  const selected = config.options.find(o => o.id === model)

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-neon-lime)]/5 to-transparent" />
      <div className="relative p-4 pb-3">
        <span className="inline-block rounded-md bg-[var(--color-neon-lime)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-neon-lime)]">
          {mode === 'image-to-video' ? 'IMAGE TO VIDEO' : 'TEXT TO VIDEO'}
        </span>
        <p className="mt-2 text-lg font-semibold text-white">
          {selected?.label ?? model}
        </p>
        {selected?.meta?.provider && (
          <p className="text-xs text-white/40">{selected.meta.provider}</p>
        )}
      </div>
    </div>
  )
}
