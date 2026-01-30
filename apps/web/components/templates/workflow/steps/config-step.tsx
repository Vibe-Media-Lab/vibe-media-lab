'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import type { ConfigStepConfig } from '@vibe-media-lab/shared'

interface ConfigValues {
  [fieldId: string]: string | number | boolean
}

interface ConfigStepProps {
  stepId: string
  label: string
  description?: string
  config: ConfigStepConfig
  value: ConfigValues
  onChange: (value: ConfigValues) => void
}

export function ConfigStep({
  stepId,
  label,
  description,
  config,
  value,
  onChange,
}: ConfigStepProps) {
  const handleFieldChange = (
    fieldId: string,
    fieldValue: string | number | boolean
  ) => {
    onChange({
      ...value,
      [fieldId]: fieldValue,
    })
  }

  React.useEffect(() => {
    const defaults: ConfigValues = {}
    let hasDefaults = false

    config.fields.forEach((field) => {
      if (field.default !== undefined && value[field.id] === undefined) {
        defaults[field.id] = field.default
        hasDefaults = true
      }
    })

    if (hasDefaults) {
      onChange({ ...defaults, ...value })
    }
  }, [config.fields, value, onChange])

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium text-white">{label}</Label>
        {description && (
          <p className="mt-1 text-sm text-white/60">{description}</p>
        )}
      </div>

      <div className="space-y-6">
        {config.fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`${stepId}-${field.id}`} className="text-white">{field.label}</Label>

            {field.type === 'text' && (
              <input
                id={`${stepId}-${field.id}`}
                type="text"
                value={String(value[field.id] ?? field.default ?? '')}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className={cn(
                  'flex h-10 w-full rounded-lg border border-white/30',
                  'bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40',
                  'focus:border-[var(--color-neon-pink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-pink)]'
                )}
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                id={`${stepId}-${field.id}`}
                value={String(value[field.id] ?? field.default ?? '')}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className={cn(
                  'flex w-full rounded-lg border border-white/30',
                  'bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40',
                  'focus:border-[var(--color-neon-pink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-pink)]',
                  'resize-none'
                )}
              />
            )}

            {field.type === 'select' && field.options && (
              <select
                id={`${stepId}-${field.id}`}
                value={String(value[field.id] ?? field.default ?? '')}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-lg border border-white/30',
                  'bg-white/5 px-3 py-2 text-sm text-white',
                  'focus:border-[var(--color-neon-pink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-pink)]'
                )}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#1a1a1a] text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'slider' && (
              <div className="flex items-center gap-4">
                <input
                  id={`${stepId}-${field.id}`}
                  type="range"
                  min={field.min ?? 0}
                  max={field.max ?? 100}
                  step={field.step ?? 1}
                  value={Number(value[field.id] ?? field.default ?? 50)}
                  onChange={(e) =>
                    handleFieldChange(field.id, Number(e.target.value))
                  }
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-white/20"
                />
                <span className="w-12 text-right text-sm text-white/60">
                  {value[field.id] ?? field.default ?? 50}
                </span>
              </div>
            )}

            {field.type === 'toggle' && (
              <button
                id={`${stepId}-${field.id}`}
                role="switch"
                aria-checked={Boolean(value[field.id] ?? field.default ?? false)}
                onClick={() =>
                  handleFieldChange(
                    field.id,
                    !Boolean(value[field.id] ?? field.default ?? false)
                  )
                }
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-pink)] focus-visible:ring-offset-2',
                  Boolean(value[field.id] ?? field.default ?? false)
                    ? 'bg-[var(--color-neon-pink)]'
                    : 'bg-white/30'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    Boolean(value[field.id] ?? field.default ?? false) &&
                      'translate-x-5'
                  )}
                />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
