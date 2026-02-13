'use client'

import * as React from 'react'
import { ImageIcon, Type, Loader2, Check, Upload, X } from 'lucide-react'
import { useVideoGenerateStore, getVideoStoreConstraints } from '@/lib/stores/video-generate-store'
import { VideoModelSelectorPopup } from './model-selector-popup'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

// ============================================================
// Constants
// ============================================================

const ALL_ASPECT_RATIOS = [
  '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '21:9',
]

const DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: '3', label: '3s' },
  { value: '4', label: '4s' },
  { value: '5', label: '5s' },
  { value: '6', label: '6s' },
  { value: '7', label: '7s' },
  { value: '8', label: '8s' },
  { value: '9', label: '9s' },
  { value: '10', label: '10s' },
  { value: '11', label: '11s' },
  { value: '12', label: '12s' },
  { value: '13', label: '13s' },
  { value: '14', label: '14s' },
  { value: '15', label: '15s' },
]

// ============================================================
// SidebarForm
// ============================================================

interface SidebarFormProps {
  className?: string
  onGenerateSuccess?: () => void
}

export function SidebarForm({ className, onGenerateSuccess }: SidebarFormProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const endFrameInputRef = React.useRef<HTMLInputElement>(null)

  const prompt = useVideoGenerateStore(s => s.prompt)
  const setPrompt = useVideoGenerateStore(s => s.setPrompt)
  const model = useVideoGenerateStore(s => s.model)
  const setModel = useVideoGenerateStore(s => s.setModel)
  const aspectRatio = useVideoGenerateStore(s => s.aspectRatio)
  const setAspectRatio = useVideoGenerateStore(s => s.setAspectRatio)
  const duration = useVideoGenerateStore(s => s.duration)
  const setDuration = useVideoGenerateStore(s => s.setDuration)
  const sound = useVideoGenerateStore(s => s.sound)
  const setSound = useVideoGenerateStore(s => s.setSound)
  const mode = useVideoGenerateStore(s => s.mode)
  const setMode = useVideoGenerateStore(s => s.setMode)
  const imagePreviewUrl = useVideoGenerateStore(s => s.imagePreviewUrl)
  const setImageFile = useVideoGenerateStore(s => s.setImageFile)
  const clearImage = useVideoGenerateStore(s => s.clearImage)
  const isGenerating = useVideoGenerateStore(s => s.isGenerating)
  const generate = useVideoGenerateStore(s => s.generate)
  const endImagePreviewUrl = useVideoGenerateStore(s => s.endImagePreviewUrl)
  const setEndImageFile = useVideoGenerateStore(s => s.setEndImageFile)
  const clearEndImage = useVideoGenerateStore(s => s.clearEndImage)

  const resolution = useVideoGenerateStore(s => s.resolution)
  const setResolution = useVideoGenerateStore(s => s.setResolution)

  const {
    allowedDurations,
    allowedAspectRatios,
    allowedVideoResolutions,
    supportsSound,
    supportsEndFrame,
  } = React.useMemo(() => getVideoStoreConstraints(model), [model])

  const showAspectRatio = allowedAspectRatios.length > 0
  const showResolution = allowedVideoResolutions.length > 0
  const showSound = supportsSound
  const showEndFrame = supportsEndFrame && mode === 'image-to-video'

  const needsImage = mode === 'image-to-video'
  const hasImage = !!imagePreviewUrl
  const canGenerate = prompt.trim().length > 0 && !isGenerating && (!needsImage || hasImage)

  const capability = mode === 'image-to-video' ? 'image-to-video' : 'text-to-video'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    e.target.value = ''
  }

  const handleEndFrameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setEndImageFile(file)
    e.target.value = ''
  }

  const handleGenerate = async () => {
    const prevTimestamp = useVideoGenerateStore.getState().lastGeneratedAt
    await generate()
    const newTimestamp = useVideoGenerateStore.getState().lastGeneratedAt
    if (newTimestamp !== prevTimestamp) {
      onGenerateSuccess?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canGenerate) handleGenerate()
    }
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
        aria-label="Upload source image for video generation"
      />
      <input
        ref={endFrameInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleEndFrameChange}
        aria-label="Upload end frame image"
      />

      {/* Frame uploads — I2V mode only */}
      {needsImage && (
        <div className={cn('grid gap-3', showEndFrame ? 'grid-cols-2' : 'grid-cols-1')}>
          {/* Start Frame */}
          <div>
            {hasImage ? (
              <div className="group/img relative overflow-hidden rounded-xl border border-white/10">
                <img
                  src={imagePreviewUrl!}
                  alt="Start frame"
                  className="w-full aspect-[4/5] object-cover"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover/img:opacity-100"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/5 aspect-[4/5] transition-colors hover:border-white/30 hover:bg-white/[0.07] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <ImageIcon className="h-5 w-5 text-white/40" />
                </div>
                <span className="text-xs text-white/40">Start frame</span>
              </button>
            )}
          </div>

          {/* End Frame */}
          {showEndFrame && (
            <div>
              {endImagePreviewUrl ? (
                <div className="group/endimg relative overflow-hidden rounded-xl border border-white/10">
                  <img
                    src={endImagePreviewUrl}
                    alt="End frame"
                    className="w-full aspect-[4/5] object-cover"
                  />
                  <button
                    onClick={clearEndImage}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover/endimg:opacity-100"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => endFrameInputRef.current?.click()}
                  disabled={isGenerating}
                  className="relative flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/5 aspect-[4/5] transition-colors hover:border-white/30 hover:bg-white/[0.07] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="absolute top-2 right-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
                    Optional
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <ImageIcon className="h-5 w-5 text-white/40" />
                  </div>
                  <span className="text-xs text-white/40">End frame</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/50">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'image-to-video'
              ? 'Describe how the image should animate...'
              : 'Describe the video you want to create...'
          }
          rows={4}
          disabled={isGenerating}
          className={cn(
            'w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30',
            'outline-none focus:border-white/20 focus:bg-white/[0.07]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        />
      </div>

      {/* Mode toggle */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/50">
          Mode
        </label>
        <div className="flex rounded-lg bg-white/5 p-1">
          <button
            onClick={() => setMode('text-to-video')}
            disabled={isGenerating}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
              mode === 'text-to-video'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60',
              'disabled:opacity-50',
            )}
          >
            <Type className="h-3.5 w-3.5" />
            Text to Video
          </button>
          <button
            onClick={() => setMode('image-to-video')}
            disabled={isGenerating}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
              mode === 'image-to-video'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60',
              'disabled:opacity-50',
            )}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Image to Video
          </button>
        </div>
      </div>

      {/* Model selector */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/50">
          Model
        </label>
        <VideoModelSelectorPopup
          value={model}
          onChange={setModel}
          capability={capability}
          disabled={isGenerating}
          triggerClassName="w-full justify-between"
          popoverSide="right"
        />
      </div>

      {/* Duration + Aspect Ratio + Resolution — adaptive grid */}
      <div className={cn(
        'grid gap-3',
        showAspectRatio && showResolution ? 'grid-cols-3' :
        showAspectRatio || showResolution ? 'grid-cols-2' : 'grid-cols-1',
      )}>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Duration
          </label>
          <DurationSelector
            value={duration}
            onChange={setDuration}
            allowedDurations={allowedDurations}
            disabled={isGenerating}
          />
        </div>
        {showAspectRatio && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">
              Aspect Ratio
            </label>
            <AspectRatioSelector
              value={aspectRatio}
              onChange={setAspectRatio}
              allowedAspectRatios={allowedAspectRatios}
              disabled={isGenerating}
            />
          </div>
        )}
        {showResolution && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">
              Resolution
            </label>
            <ResolutionSelector
              value={resolution}
              onChange={setResolution}
              allowedVideoResolutions={allowedVideoResolutions}
              disabled={isGenerating}
            />
          </div>
        )}
      </div>

      {/* Sound toggle — only for models that support it */}
      {showSound && (
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
          <label className="text-sm font-medium text-white/70">Sound</label>
          <Switch
            checked={sound}
            onCheckedChange={setSound}
            disabled={isGenerating}
          />
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors',
          'bg-[var(--color-neon-lime)] text-black',
          'hover:brightness-110',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100',
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            생성 중...
          </>
        ) : (
          'Generate'
        )}
      </button>

      {/* I2V guide — shown when image is required but missing */}
      {needsImage && !hasImage && (
        <p className="text-center text-xs text-orange-400">
          I2V 모드에는 소스 이미지가 필요합니다
        </p>
      )}
    </div>
  )
}

// ============================================================
// Duration Selector Popover
// ============================================================

function DurationSelector({
  value,
  onChange,
  allowedDurations,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  allowedDurations: string[]
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const visibleOptions = DURATION_OPTIONS.filter(opt => allowedDurations.includes(opt.value))

  if (visibleOptions.length <= 1) {
    return (
      <span className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium bg-white/5 text-white/40 cursor-default">
        {visibleOptions[0]?.label ?? `${value}s`}
      </span>
    )
  }

  // 6개 이상 → 슬라이더 바
  if (visibleOptions.length > 5) {
    return (
      <DurationSlider
        value={value}
        onChange={onChange}
        options={visibleOptions}
        disabled={disabled}
      />
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {value}s
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-48 p-0">
        <div className="px-5 pt-5 pb-2">
          <p className="text-base font-semibold text-white">Duration</p>
        </div>
        <div className="px-3 pb-3 space-y-1">
          {visibleOptions.map((opt) => {
            const isSelected = value === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors',
                  isSelected ? 'bg-white/10' : 'hover:bg-white/5',
                )}
              >
                <span className="flex-1 text-base font-medium text-white">{opt.label}</span>
                {isSelected && <Check className="h-5 w-5 shrink-0 text-white/60" />}
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
  value: string
  onChange: (v: string) => void
  allowedAspectRatios: string[]
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (v: string) => {
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
            'flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <RatioIcon ratio={value} />
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64 p-0">
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
                {isSelected && <Check className="h-5 w-5 shrink-0 text-white/60" />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Resolution Selector Popover
// ============================================================

function ResolutionSelector({
  value,
  onChange,
  allowedVideoResolutions,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  allowedVideoResolutions: string[]
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  if (allowedVideoResolutions.length <= 1) {
    return (
      <span className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium bg-white/5 text-white/40 cursor-default">
        {allowedVideoResolutions[0] ?? value}
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-48 p-0">
        <div className="px-5 pt-5 pb-2">
          <p className="text-base font-semibold text-white">Resolution</p>
        </div>
        <div className="px-3 pb-3 space-y-1">
          {allowedVideoResolutions.map((res) => {
            const isSelected = value === res
            return (
              <button
                key={res}
                onClick={() => handleSelect(res)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors',
                  isSelected ? 'bg-white/10' : 'hover:bg-white/5',
                )}
              >
                <span className="flex-1 text-base font-medium text-white">{res}</span>
                {isSelected && <Check className="h-5 w-5 shrink-0 text-white/60" />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Duration Slider (>5 options, e.g. Kling v3: 3-15s)
// ============================================================

function DurationSlider({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  const idx = options.findIndex(o => o.value === value)
  const currentIdx = idx >= 0 ? idx : 0

  return (
    <div className={cn('flex flex-col gap-1', disabled && 'opacity-50 pointer-events-none')}>
      <span className="text-sm font-medium text-white">{options[currentIdx]?.label}</span>
      <input
        type="range"
        min={0}
        max={options.length - 1}
        step={1}
        value={currentIdx}
        onChange={(e) => {
          const opt = options[parseInt(e.target.value, 10)]
          if (opt) onChange(opt.value)
        }}
        aria-label="Select video duration"
        aria-valuetext={options[currentIdx]?.label}
        className="w-full accent-[var(--color-neon-lime)] h-1.5 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-white/30">
        <span>{options[0]?.label}</span>
        <span>{options[options.length - 1]?.label}</span>
      </div>
    </div>
  )
}
