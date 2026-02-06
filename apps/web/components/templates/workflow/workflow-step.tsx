'use client'

import * as React from 'react'
import type {
  WorkflowStep as WorkflowStepType,
  TextInputStepConfig,
  MediaUploadStepConfig,
  StyleSelectStepConfig,
  AiGenerateStepConfig,
  ConfigStepConfig,
  GenerationReviewStepConfig,
  MediaChoiceStepConfig,
} from '@vibe-media-lab/shared'
import { TextInputStep } from './steps/text-input-step'
import { MediaUploadStep } from './steps/media-upload-step'
import { StyleSelectStep } from './steps/style-select-step'
import { AiGenerateStep } from './steps/ai-generate-step'
import { ConfigStep } from './steps/config-step'
import { GenerationReviewStep } from './steps/generation-review-step'
import { MediaChoiceStep } from './steps/media-choice-step'

interface WorkflowStepProps {
  step: WorkflowStepType
  value: unknown
  onChange: (value: unknown) => void
  inputContext?: Record<string, unknown>
  projectId?: string | null
}

export function WorkflowStep({
  step,
  value,
  onChange,
  inputContext,
  projectId,
}: WorkflowStepProps) {
  switch (step.type) {
    case 'text-input':
      return (
        <TextInputStep
          stepId={step.id}
          label={step.label}
          description={step.description}
          config={step.config as TextInputStepConfig}
          value={(value as string) || ''}
          onChange={onChange}
        />
      )

    case 'media-upload':
      return (
        <MediaUploadStep
          stepId={step.id}
          label={step.label}
          description={step.description}
          config={step.config as MediaUploadStepConfig}
          value={(value as Array<{ id: string; file: File; preview?: string }>) || []}
          onChange={onChange}
        />
      )

    case 'style-select':
      return (
        <StyleSelectStep
          stepId={step.id}
          label={step.label}
          description={step.description}
          config={step.config as StyleSelectStepConfig}
          value={(value as string | string[]) || ''}
          onChange={onChange}
        />
      )

    case 'ai-generate':
      return (
        <AiGenerateStep
          stepId={step.id}
          label={step.label}
          description={step.description}
          config={step.config as AiGenerateStepConfig}
          value={value as { url: string; generatedAt: Date } | null}
          onChange={onChange}
          inputContext={inputContext}
        />
      )

    case 'config':
      return (
        <ConfigStep
          stepId={step.id}
          label={step.label}
          description={step.description}
          config={step.config as ConfigStepConfig}
          value={(value as Record<string, string | number | boolean>) || {}}
          onChange={onChange}
        />
      )

    case 'generation-review':
      return (
        <GenerationReviewStep
          stepId={step.id}
          label={step.label}
          description={step.description}
          config={step.config as GenerationReviewStepConfig}
          value={value as { data: unknown; generatedAt: Date } | null}
          onChange={onChange}
          inputContext={inputContext}
          projectId={projectId}
        />
      )

    case 'media-choice':
      return (
        <MediaChoiceStep
          stepId={step.id}
          label={step.label}
          description={step.description}
          config={step.config as MediaChoiceStepConfig}
          value={
            value as {
              mode: 'upload' | 'generate'
              files?: Array<{ id: string; file: File; preview: string; category?: string }>
              generated?: Array<{ id: string; url: string; category?: string; label?: string }>
            } | null
          }
          onChange={onChange}
          inputContext={inputContext}
          projectId={projectId}
        />
      )

    default:
      return (
        <div className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
          Unknown step type: {step.type}
        </div>
      )
  }
}
