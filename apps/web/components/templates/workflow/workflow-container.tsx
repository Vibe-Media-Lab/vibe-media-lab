'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkflowStepper } from './workflow-stepper'
import { WorkflowStep } from './workflow-step'
import { WorkflowResult } from './workflow-result'
import {
  useWorkflowStore,
  canProceedToNext,
  getWorkflowProgress,
} from '@/lib/stores/workflow-store'
import type { Template } from '@vibe-media-lab/shared'

interface WorkflowContainerProps {
  template: Template
}

export function WorkflowContainer({ template }: WorkflowContainerProps) {
  const router = useRouter()
  const {
    steps,
    currentStepIndex,
    stepData,
    status,
    outputUrl,
    error,
    initWorkflow,
    setStepData,
    goToStep,
    nextStep,
    prevStep,
    startGeneration,
    setOutputUrl,
    setError,
    setCompleted,
    reset,
  } = useWorkflowStore()

  React.useEffect(() => {
    initWorkflow(template.id, template.workflow.steps)
  }, [template.id, template.workflow.steps, initWorkflow])

  const currentStep = steps[currentStepIndex]
  const canGoNext = canProceedToNext(stepData, steps, currentStepIndex)
  const isLastStep = currentStepIndex === steps.length - 1
  const progress = getWorkflowProgress(stepData, steps)

  const handleStepDataChange = (value: unknown) => {
    if (currentStep) {
      setStepData(currentStep.id, value)
    }
  }

  const handleGenerate = async () => {
    startGeneration()

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000))

      setOutputUrl('/templates/brainrot.mp4')
      setCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
  }

  const handleReset = () => {
    reset()
    initWorkflow(template.id, template.workflow.steps)
  }

  if (status === 'generating' || status === 'completed' || status === 'failed') {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/templates/${template.id}`}
            className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to {template.title}
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
          <WorkflowResult
            status={status}
            outputUrl={outputUrl}
            error={error}
            onReset={handleReset}
            onGenerate={handleGenerate}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href={`/templates/${template.id}`}
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {template.title}
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{template.title}</h1>
        <p className="mt-1 text-white/60">{template.description}</p>
      </div>

      <div className="mb-8">
        <WorkflowStepper
          steps={steps}
          currentIndex={currentStepIndex}
          stepData={stepData}
          onStepClick={goToStep}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        {currentStep && (
          <WorkflowStep
            step={currentStep}
            value={stepData[currentStep.id]}
            onChange={handleStepDataChange}
            inputContext={stepData}
          />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="border-white/30 bg-transparent text-white transition-all duration-200 hover:scale-105 hover:border-white/50 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          이전
        </Button>

        <div className="text-sm text-white/60">
          {progress}% 완료
        </div>

        {isLastStep ? (
          <Button
            onClick={handleGenerate}
            disabled={!canGoNext}
            className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-neon-pink)]/30"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            생성하기
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            disabled={!canGoNext}
            className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-neon-pink)]/30"
          >
            다음
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
