'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  CHARACTER_ARCHETYPES,
  getDisabledOptions,
  type ArchetypeParam,
} from '@/lib/data/character-archetypes'
import type { ArchetypeSelectStepConfig } from '@vibe-media-lab/shared'

interface ArchetypeSelectStepProps {
  stepId: string
  config: ArchetypeSelectStepConfig
  value: { archetype: string; freeText?: string; params?: Record<string, string> } | null
  onChange: (value: unknown) => void
}

function ArchetypeThumbnail({ url, label, colorHint }: { url: string; label: string; colorHint: string }) {
  const [failed, setFailed] = React.useState(false)

  if (!url || failed) {
    return (
      <div
        className="flex aspect-square w-full items-center justify-center rounded-lg"
        style={{ background: `linear-gradient(135deg, ${colorHint}40, ${colorHint}10)` }}
      >
        <span className="text-2xl font-bold text-white/60">{label.charAt(0)}</span>
      </div>
    )
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/5">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG placeholder, next/image unnecessary */}
      <img
        src={url}
        alt={label}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export function ArchetypeSelectStep({
  stepId,
  config,
  value,
  onChange,
}: ArchetypeSelectStepProps) {
  const selectedArchetype = value?.archetype || ''
  const freeText = value?.freeText || ''
  const maxFreeTextLength = config.maxFreeTextLength || 500
  const freeTextPlaceholder = config.freeTextPlaceholder || '캐릭터를 직접 설명해주세요'
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  const handleSelect = (archetypeId: string) => {
    // 같은 아키타입 재클릭 → 기존 params/freeText 보존
    if (archetypeId === selectedArchetype) return

    // 다른 아키타입으로 변경 → 해당 아키타입의 기본값으로 초기화
    const arch = CHARACTER_ARCHETYPES.find((a) => a.id === archetypeId)
    const defaultParams: Record<string, string> = {}
    if (arch?.parameters) {
      for (const p of arch.parameters) {
        defaultParams[p.id] = p.defaultValue
      }
    }

    onChange({
      archetype: archetypeId,
      freeText: archetypeId === 'freetext' ? (value?.freeText || undefined) : undefined,
      params: Object.keys(defaultParams).length > 0 ? defaultParams : undefined,
    })
    setShowAdvanced(false)
  }

  const handleParamChange = (paramId: string, newValue: string) => {
    const updatedParams = { ...(value?.params || {}), [paramId]: newValue }
    onChange({
      archetype: selectedArchetype,
      freeText: selectedArchetype === 'freetext' ? freeText : undefined,
      params: updatedParams,
    })
  }

  const handleFreeTextChange = (text: string) => {
    onChange({
      archetype: 'freetext',
      freeText: text,
      params: value?.params,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const archetypes = CHARACTER_ARCHETYPES
    let nextIndex: number | null = null

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        nextIndex = (index + 1) % archetypes.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        nextIndex = (index - 1 + archetypes.length) % archetypes.length
        break
      case ' ':
      case 'Enter':
        e.preventDefault()
        handleSelect(archetypes[index]!.id)
        return
    }

    if (nextIndex !== null) {
      const nextArchetype = archetypes[nextIndex]!
      handleSelect(nextArchetype.id)
      const nextElement = document.querySelector(
        `[data-archetype-id="${nextArchetype.id}"]`
      ) as HTMLElement
      nextElement?.focus()
    }
  }

  const selectedArch = CHARACTER_ARCHETYPES.find((a) => a.id === selectedArchetype)
  const primaryParams = (selectedArch?.parameters || []).filter((p) => p.priority === 'primary')
  const advancedParams = (selectedArch?.parameters || []).filter((p) => p.priority === 'advanced')
  const currentParams = value?.params || {}

  function renderParamChips(param: ArchetypeParam) {
    const disabledSet = getDisabledOptions(selectedArchetype, param.id, currentParams)

    return (
      <div key={param.id} className="space-y-1.5">
        <span className="text-sm font-medium text-white/70">{param.label}</span>
        <div className="flex flex-wrap gap-2">
          {param.options.map((opt) => {
            const isActive = currentParams[param.id] === opt.value
            const isDisabled = disabledSet.has(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isDisabled}
                onClick={() => handleParamChange(param.id, opt.value)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                  isDisabled && 'cursor-not-allowed opacity-30',
                  isActive
                    ? 'bg-[var(--color-neon-cyan)] text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20',
                )}
                title={isDisabled ? '이 조합은 사용할 수 없습니다' : undefined}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium text-white">캐릭터 아키타입</Label>
        <p className="mt-1 text-sm text-white/60">
          캐릭터의 기본 유형을 선택하거나 직접 설명해주세요
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="캐릭터 아키타입 선택"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {CHARACTER_ARCHETYPES.map((archetype, index) => {
          const isSelected = selectedArchetype === archetype.id
          const colorHint = archetype.preset.colorSuggestions[0] || '#888888'
          return (
            <button
              key={archetype.id}
              role="radio"
              aria-checked={isSelected}
              aria-label={archetype.label}
              data-archetype-id={archetype.id}
              tabIndex={isSelected || (!selectedArchetype && index === 0) ? 0 : -1}
              onClick={() => handleSelect(archetype.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-cyan)]',
                isSelected
                  ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)]/10 text-white'
                  : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10'
              )}
            >
              <ArchetypeThumbnail
                url={archetype.thumbnailUrl}
                label={archetype.label}
                colorHint={colorHint}
              />
              <span className="text-sm font-semibold leading-tight">{archetype.label}</span>
            </button>
          )
        })}
      </div>

      {/* 파라미터 패널 */}
      {selectedArch?.parameters && selectedArch.parameters.length > 0 && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          {/* primary 칩 */}
          {primaryParams.map(renderParamChips)}

          {/* advanced 토글 */}
          {advancedParams.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="text-sm text-white/50 hover:text-white/70 transition-colors"
              >
                {showAdvanced ? '접기' : '더보기'}
              </button>
              {showAdvanced && advancedParams.map(renderParamChips)}
            </>
          )}
        </div>
      )}

      {selectedArchetype === 'freetext' && (
        <div className="space-y-2">
          <Label htmlFor={`${stepId}-freetext`} className="text-sm text-white/70">
            캐릭터 설명
          </Label>
          <textarea
            id={`${stepId}-freetext`}
            value={freeText}
            onChange={(e) => handleFreeTextChange(e.target.value)}
            placeholder={freeTextPlaceholder}
            maxLength={maxFreeTextLength}
            rows={4}
            className={cn(
              'w-full resize-none rounded-lg border border-white/20 bg-white/5 p-3',
              'text-sm text-white placeholder:text-white/30',
              'focus:border-[var(--color-neon-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)]'
            )}
          />
          <div className="text-right text-xs text-white/40">
            {freeText.length}/{maxFreeTextLength}
          </div>
        </div>
      )}
    </div>
  )
}
