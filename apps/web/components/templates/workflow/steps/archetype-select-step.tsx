'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { CHARACTER_ARCHETYPES } from '@/lib/data/character-archetypes'
import type { ArchetypeSelectStepConfig } from '@vibe-media-lab/shared'

interface ArchetypeSelectStepProps {
  stepId: string
  config: ArchetypeSelectStepConfig
  value: { archetype: string; freeText?: string } | null
  onChange: (value: unknown) => void
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

  const handleSelect = (archetypeId: string) => {
    onChange({
      archetype: archetypeId,
      freeText: archetypeId === 'freetext' ? freeText : undefined,
    })
  }

  const handleFreeTextChange = (text: string) => {
    onChange({
      archetype: 'freetext',
      freeText: text,
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
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
      >
        {CHARACTER_ARCHETYPES.map((archetype, index) => {
          const isSelected = selectedArchetype === archetype.id
          return (
            <button
              key={archetype.id}
              role="radio"
              aria-checked={isSelected}
              data-archetype-id={archetype.id}
              tabIndex={isSelected || (!selectedArchetype && index === 0) ? 0 : -1}
              onClick={() => handleSelect(archetype.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-cyan)]',
                isSelected
                  ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)]/10 text-white'
                  : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10'
              )}
            >
              <span className="text-lg font-semibold">{archetype.label}</span>
              <span className="text-xs text-white/50">{archetype.description}</span>
            </button>
          )
        })}
      </div>

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
