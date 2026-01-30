'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { WorkflowStep } from '@vibe-media-lab/shared'
import { isStepComplete, type StepData } from '@/lib/stores/workflow-store'

interface WorkflowStepperProps {
  steps: WorkflowStep[]
  currentIndex: number
  stepData: StepData
  onStepClick: (index: number) => void
}

export function WorkflowStepper({
  steps,
  currentIndex,
  stepData,
  onStepClick,
}: WorkflowStepperProps) {
  return (
    <nav aria-label="워크플로우 진행 상태" className="w-full">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isComplete = isStepComplete(stepData, step)
          const isCurrent = index === currentIndex
          const isPast = index < currentIndex
          const canClick = isPast || (isCurrent && isComplete) || index === currentIndex

          return (
            <li key={step.id} className="flex flex-1 items-center">
              <button
                onClick={() => canClick && onStepClick(index)}
                disabled={!canClick}
                className={cn(
                  'group flex flex-1 flex-col items-center gap-2',
                  'focus-visible:outline-none',
                  canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className="flex w-full items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      'text-xs font-medium transition-all duration-200',
                      'focus-visible:ring-2 focus-visible:ring-[var(--color-neon-pink)] focus-visible:ring-offset-2',
                      isComplete || isPast
                        ? 'bg-[var(--color-neon-pink)] text-white'
                        : isCurrent
                          ? 'border-2 border-[var(--color-neon-pink)] bg-transparent text-[var(--color-neon-pink)]'
                          : 'border border-white/30 bg-transparent text-white/60'
                    )}
                  >
                    {isComplete || isPast ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'mx-2 h-0.5 flex-1 transition-colors duration-200',
                        isPast || (isCurrent && isComplete)
                          ? 'bg-[var(--color-neon-pink)]'
                          : 'bg-white/30'
                      )}
                    />
                  )}
                </div>

                <span
                  className={cn(
                    'text-xs transition-colors',
                    'hidden sm:block',
                    isCurrent
                      ? 'font-medium text-white'
                      : 'text-white/60'
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
