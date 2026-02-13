'use client'

import * as React from 'react'
import { Plus, X, Loader2, Minus, Gem, Check } from 'lucide-react'
import { useImageGenerateStore, getStoreConstraints } from '@/lib/stores/image-generate-store'
import { ModelSelectorPopup } from './model-selector-popup'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { AspectRatio, ImageResolution } from '@/lib/services/types'
import { toast } from 'sonner'

// ============================================================
// Aspect ratio / resolution full sets (cycle source)
// ============================================================

const ALL_ASPECT_RATIOS: AspectRatio[] = [
  '1:1', '4:3', '16:9', '21:9', '5:4', '3:2', '2:3', '9:16', '3:4', '4:5',
]
const ALL_RESOLUTIONS: ImageResolution[] = ['1K', '2K', '4K']

const RESOLUTION_OPTIONS: {
  value: ImageResolution
  description: string
  badge?: string
}[] = [
  { value: '1K', description: 'Fast · Quick Generation, Good Resolution' },
  { value: '2K', description: 'Balanced · Recommended For Most Use Cases' },
  { value: '4K', description: 'Ultra · Highest Detail, Longer Processing', badge: 'Premium' },
]

export function PromptBar() {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const prompt = useImageGenerateStore(s => s.prompt)
  const setPrompt = useImageGenerateStore(s => s.setPrompt)
  const model = useImageGenerateStore(s => s.model)
  const setModel = useImageGenerateStore(s => s.setModel)
  const aspectRatio = useImageGenerateStore(s => s.aspectRatio)
  const setAspectRatio = useImageGenerateStore(s => s.setAspectRatio)
  const resolution = useImageGenerateStore(s => s.resolution)
  const setResolution = useImageGenerateStore(s => s.setResolution)
  const count = useImageGenerateStore(s => s.count)
  const setCount = useImageGenerateStore(s => s.setCount)
  const referencePreviewUrls = useImageGenerateStore(s => s.referencePreviewUrls)
  const addReferenceFile = useImageGenerateStore(s => s.addReferenceFile)
  const removeReferenceFile = useImageGenerateStore(s => s.removeReferenceFile)
  const clearReferences = useImageGenerateStore(s => s.clearReferences)
  const isGenerating = useImageGenerateStore(s => s.isGenerating)
  const generate = useImageGenerateStore(s => s.generate)

  const hasReferences = referencePreviewUrls.length > 0

  // Model constraints
  const { maxRefImages, allowedResolutions, allowedAspectRatios } = React.useMemo(
    () => getStoreConstraints(model),
    [model],
  )

  const refCount = referencePreviewUrls.length
  const isRefLimitReached = refCount >= maxRefImages

  // File input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const remaining = maxRefImages - refCount
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))

    if (fileArray.length > remaining) {
      toast.warning(`최대 ${maxRefImages}장까지 추가 가능합니다. ${remaining}장만 추가합니다.`)
    }

    for (const file of fileArray.slice(0, Math.max(0, remaining))) {
      addReferenceFile(file)
    }
    // Reset input value so the same file can be selected again
    e.target.value = ''
  }

  const canGenerate = prompt.trim().length > 0 && !isGenerating

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canGenerate) {
        generate()
      }
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-white/10 bg-[#1a1a1a]/95 shadow-2xl backdrop-blur-xl">
          {/* Reference image thumbnails */}
          {hasReferences && (
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                {referencePreviewUrls.map((url, i) => (
                  <div key={i} className="group/thumb relative shrink-0">
                    <img
                      src={url}
                      alt={`Reference ${i + 1}`}
                      className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/10"
                    />
                    <button
                      onClick={() => removeReferenceFile(i)}
                      className="absolute -top-1.5 -right-1.5 hidden rounded-full bg-red-500 p-0.5 group-hover/thumb:block"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <span className="shrink-0 text-xs tabular-nums text-white/40">
                {refCount}/{maxRefImages}
              </span>
              <button
                onClick={clearReferences}
                className="shrink-0 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Main input row */}
          <div className="flex items-end gap-2 px-4 py-3">
            {/* Reference upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating || isRefLimitReached}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              title={isRefLimitReached ? `최대 ${maxRefImages}장` : '참조 이미지 추가'}
            >
              <Plus className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleFileChange}
            />

            {/* Prompt textarea */}
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the image you want to create..."
              rows={1}
              disabled={isGenerating}
              className={cn(
                'flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30',
                'min-h-[40px] max-h-[120px] py-2.5 outline-none',
                'disabled:opacity-50',
              )}
            />

            {/* Generate button */}
            <button
              onClick={() => generate()}
              disabled={!canGenerate}
              className={cn(
                'flex h-10 shrink-0 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors',
                'bg-[var(--color-neon-lime)] text-black',
                'hover:brightness-110',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100',
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중
                </>
              ) : (
                'Generate'
              )}
            </button>
          </div>

          {/* Settings row */}
          <div className="flex items-center gap-2 border-t border-white/5 px-4 py-2">
            {/* Model selector */}
            <ModelSelectorPopup
              value={model}
              onChange={setModel}
              hasReferences={hasReferences}
              disabled={isGenerating}
            />

            {/* Resolution selector */}
            <ResolutionSelector
              value={resolution}
              onChange={setResolution}
              allowedResolutions={allowedResolutions}
              disabled={isGenerating}
            />

            {/* Aspect ratio selector */}
            <AspectRatioSelector
              value={aspectRatio}
              onChange={setAspectRatio}
              allowedAspectRatios={allowedAspectRatios}
              disabled={isGenerating}
            />

            <div className="flex-1" />

            {/* Count selector */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCount(count - 1)}
                disabled={isGenerating || count <= 1}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white',
                  'disabled:opacity-30 disabled:cursor-not-allowed',
                )}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-base font-medium text-white/70 tabular-nums">
                {count}
              </span>
              <button
                onClick={() => setCount(count + 1)}
                disabled={isGenerating || count >= 4}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white',
                  'disabled:opacity-30 disabled:cursor-not-allowed',
                )}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Resolution Selector Popover
// ============================================================

function ResolutionSelector({
  value,
  onChange,
  allowedResolutions,
  disabled,
}: {
  value: ImageResolution
  onChange: (v: ImageResolution) => void
  allowedResolutions: ImageResolution[]
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const isFixed = allowedResolutions.length <= 1

  const handleSelect = (v: ImageResolution) => {
    onChange(v)
    setOpen(false)
  }

  // 고정 해상도 (팝업 없이 표시만)
  if (isFixed) {
    return (
      <span
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-base font-medium bg-white/5 text-white/40 cursor-default"
        title="이 모델은 고정 해상도입니다"
      >
        <Gem className="h-4 w-4" />
        {allowedResolutions[0] ?? value}
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-base font-medium transition-colors',
            'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <Gem className="h-4 w-4" />
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        <div className="px-5 pt-5 pb-2">
          <p className="text-base font-semibold text-white">Select quality</p>
        </div>
        <div className="px-3 pb-3 space-y-1">
          {RESOLUTION_OPTIONS.map((opt) => {
            const isAllowed = allowedResolutions.includes(opt.value)
            const isSelected = value === opt.value
            return (
              <button
                key={opt.value}
                disabled={!isAllowed}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors',
                  isSelected ? 'bg-white/10' : 'hover:bg-white/5',
                  !isAllowed && 'opacity-30 cursor-not-allowed',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[var(--color-neon-lime)]">
                      {opt.value}
                    </span>
                    {opt.badge && (
                      <span className="rounded border border-[var(--color-neon-lime)]/40 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-neon-lime)]">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-white/50">{opt.description}</p>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 shrink-0 text-white/60" />
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Aspect Ratio Selector Popover
// ============================================================

/** 비율에 맞는 미니 사각형 아이콘 */
function RatioIcon({ ratio, className }: { ratio: string; className?: string }) {
  const [w, h] = ratio.split(':').map(Number)
  const maxDim = 16
  const scale = maxDim / Math.max(w!, h!)
  const rw = Math.round(w! * scale)
  const rh = Math.round(h! * scale)
  return (
    <div
      className={cn('shrink-0 rounded-[2px] border-2 border-current', className)}
      style={{ width: rw, height: rh }}
    />
  )
}

function AspectRatioSelector({
  value,
  onChange,
  allowedAspectRatios,
  disabled,
}: {
  value: AspectRatio
  onChange: (v: AspectRatio) => void
  allowedAspectRatios: AspectRatio[]
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (v: AspectRatio) => {
    onChange(v)
    setOpen(false)
  }

  const hasConstraints = allowedAspectRatios.length < ALL_ASPECT_RATIOS.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-base font-medium transition-colors',
            'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <RatioIcon ratio={value} />
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-0">
        <div className="px-5 pt-5 pb-2">
          <p className="text-base font-semibold text-white">Aspect ratio</p>
        </div>
        <div className="max-h-[360px] overflow-y-auto px-3 pb-3">
          {ALL_ASPECT_RATIOS.map((ratio) => {
            const isAllowed = !hasConstraints || allowedAspectRatios.includes(ratio)
            const isSelected = value === ratio
            return (
              <button
                key={ratio}
                disabled={!isAllowed}
                onClick={() => handleSelect(ratio)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors',
                  isSelected ? 'bg-white/10' : 'hover:bg-white/5',
                  !isAllowed && 'opacity-30 cursor-not-allowed',
                )}
              >
                <RatioIcon ratio={ratio} className="text-white/50" />
                <span className="flex-1 text-base font-medium text-white">{ratio}</span>
                {isSelected && (
                  <Check className="h-5 w-5 shrink-0 text-white/60" />
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
