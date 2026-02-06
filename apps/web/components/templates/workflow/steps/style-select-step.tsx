'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { Label } from '@/components/ui/label'
import type { StyleSelectStepConfig } from '@vibe-media-lab/shared'

interface StyleSelectStepProps {
  stepId: string
  label: string
  description?: string
  config: StyleSelectStepConfig
  value: string | string[]
  onChange: (value: string | string[]) => void
}

export function StyleSelectStep({
  label,
  description,
  config,
  value,
  onChange,
}: StyleSelectStepProps) {
  const isMultiple = config.multiple
  const selectedIds = isMultiple
    ? (Array.isArray(value) ? value : [])
    : (typeof value === 'string' ? [value] : [])

  const handleSelect = (optionId: string) => {
    if (isMultiple) {
      const currentSelected = Array.isArray(value) ? value : []
      const newSelected = currentSelected.includes(optionId)
        ? currentSelected.filter((id) => id !== optionId)
        : [...currentSelected, optionId]
      onChange(newSelected)
    } else {
      onChange(optionId)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium text-white">{label}</Label>
        {description && (
          <p className="mt-1 text-sm text-white/60">{description}</p>
        )}
        {isMultiple && (
          <p className="mt-1 text-xs text-white/60">
            여러 개를 선택할 수 있습니다
          </p>
        )}
      </div>

      <div
        role="listbox"
        aria-multiselectable={isMultiple}
        aria-label={label}
        className="grid gap-3 sm:grid-cols-2"
      >
        {config.options.map((option) => {
          const isSelected = selectedIds.includes(option.id)

          return (
            <button
              key={option.id}
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelect(option.id)}
              className={cn(
                'relative flex items-start gap-3 rounded-xl p-4 text-left',
                'border-2 transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-pink)] focus-visible:ring-offset-2',
                isSelected
                  ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/5'
                  : 'border-white/30 bg-white/5 hover:border-white/50'
              )}
            >
              {option.preview && (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={option.preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{option.label}</p>
                {option.description && (
                  <p className="mt-0.5 text-sm text-white/60">
                    {option.description}
                  </p>
                )}
              </div>

              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  'transition-colors duration-200',
                  isSelected
                    ? 'bg-[var(--color-neon-pink)] text-white'
                    : 'border border-white/50'
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
