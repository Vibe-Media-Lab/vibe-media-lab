'use client'

import { Check } from 'lucide-react'
import type { ModelOption } from '@vibe-media-lab/shared'
import { cn } from '@/lib/utils'

export function ConstraintBadges({ option }: { option: ModelOption }) {
  const badges: Array<{ label: string; color: string }> = []
  const c = option.constraints

  if (!c) return null

  if (c.maxRefImages === 1) {
    badges.push({ label: '1장 참조', color: 'bg-orange-500/20 text-orange-400' })
  } else if (c.maxRefImages !== undefined && c.maxRefImages < 14) {
    badges.push({ label: `최대 ${c.maxRefImages}장`, color: 'bg-orange-500/20 text-orange-400' })
  }

  if (c.resolutions && c.resolutions.length === 1) {
    badges.push({ label: '고정 해상도', color: 'bg-purple-500/20 text-purple-400' })
  }

  if (c.aspectRatios && c.aspectRatios.length > 0 && c.aspectRatios.length < 7) {
    badges.push({ label: '일부 비율', color: 'bg-purple-500/20 text-purple-400' })
  }

  // Duration 범위 (예: "5–10s")
  if (c.durations && c.durations.length > 0) {
    const nums = c.durations.map(Number).sort((a, b) => a - b)
    const label = nums.length === 1 ? `${nums[0]}s` : `${nums[0]}–${nums[nums.length - 1]}s`
    badges.push({ label, color: 'bg-blue-500/20 text-blue-400' })
  }

  // Video resolution 최대값 (예: "1080p")
  if (c.videoResolutions && c.videoResolutions.length > 0) {
    const sorted = [...c.videoResolutions].sort((a, b) => parseInt(b) - parseInt(a))
    badges.push({ label: sorted[0]!, color: 'bg-cyan-500/20 text-cyan-400' })
  }

  // Sound 지원
  if (c.supportsSound) {
    badges.push({ label: 'Sound', color: 'bg-green-500/20 text-green-400' })
  }

  // End Frame 지원
  if (c.supportsEndFrame) {
    badges.push({ label: 'End Frame', color: 'bg-amber-500/20 text-amber-400' })
  }

  if (badges.length === 0) return null

  return (
    <>
      {badges.map((b) => (
        <span
          key={b.label}
          className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', b.color)}
        >
          {b.label}
        </span>
      ))}
    </>
  )
}

export function OptionRow({
  option,
  selected,
  onSelect,
  role,
  'aria-selected': ariaSelected,
}: {
  option: ModelOption
  selected: boolean
  onSelect: (id: string) => void
  role?: string
  'aria-selected'?: boolean
}) {
  return (
    <button
      role={role}
      aria-selected={ariaSelected}
      tabIndex={role === 'option' ? -1 : undefined}
      onClick={() => onSelect(option.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
        selected ? 'bg-white/10' : 'hover:bg-white/5',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{option.label}</span>
          {option.recommended && (
            <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
              추천
            </span>
          )}
          {option.meta?.badge && (
            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
              {option.meta.badge}
            </span>
          )}
          <ConstraintBadges option={option} />
        </div>
        {option.description && (
          <p className="mt-0.5 text-xs text-white/40 truncate">{option.description}</p>
        )}
        {option.meta && (
          <div className="mt-1 flex items-center gap-2 text-[10px] text-white/30">
            <span>Quality: {option.meta.quality}</span>
            <span>Cost: {option.meta.cost}</span>
          </div>
        )}
      </div>
      {selected && (
        <Check className="h-4 w-4 shrink-0 text-green-400" />
      )}
    </button>
  )
}
