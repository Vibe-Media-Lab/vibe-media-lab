'use client'

import * as React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { TextInputStepConfig } from '@vibe-media-lab/shared'

interface TextInputStepProps {
  stepId: string
  label: string
  description?: string
  config: TextInputStepConfig
  value: string
  onChange: (value: string) => void
}

export function TextInputStep({
  stepId,
  label,
  description,
  config,
  value,
  onChange,
}: TextInputStepProps) {
  const charCount = value.length
  const maxLength = config.maxLength || 1000

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={stepId} className="text-base font-medium text-white">
          {label}
        </Label>
        {description && (
          <p className="mt-1 text-sm text-white/60">{description}</p>
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          id={stepId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          rows={config.rows || 4}
          maxLength={maxLength}
          className="min-h-[120px] resize-none border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:bg-white/10"
        />

        <div className="flex items-center justify-between text-xs text-white/60">
          {config.hint && <span>{config.hint}</span>}
          <span className="ml-auto">
            {charCount} / {maxLength}
          </span>
        </div>
      </div>
    </div>
  )
}
