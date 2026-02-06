'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Cloud, CloudOff } from 'lucide-react'
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
  const searchParams = useSearchParams()
  const projectIdParam = searchParams?.get('projectId')

  const {
    steps,
    currentStepIndex,
    stepData,
    status,
    outputUrl,
    error,
    projectId,
    isSaving,
    lastSavedAt,
    isRestoring,
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
    setProjectId,
    loadProject,
    restoreFromProject,
  } = useWorkflowStore()

  const [isInitializing, setIsInitializing] = React.useState(true)
  const [initError, setInitError] = React.useState<string | null>(null)
  const hasInitialized = React.useRef(false)

  // Initialize workflow: restore from projectId or create new project
  React.useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    async function initializeProject() {
      setIsInitializing(true)
      setInitError(null)

      try {
        if (projectIdParam) {
          // Restore mode: load existing project
          const response = await fetch(`/api/projects/${projectIdParam}`)

          if (!response.ok) {
            // Project not found, create new one
            await createNewProject()
            return
          }

          const data = await response.json()

          if (!data.success || !data.project) {
            await createNewProject()
            return
          }

          // Verify template matches
          if (data.project.templateId !== template.id) {
            await createNewProject()
            return
          }

          // Initialize workflow with template steps first
          initWorkflow(template.id, template.workflow.steps)
          setProjectId(data.project.id)

          // Then restore project data
          restoreFromProject({
            stepData: data.project.stepData || {},
            currentStepIndex: data.project.currentStepIndex || 0,
            outputUrl: data.project.outputUrl,
            status: data.project.status,
          })
        } else {
          // New project mode
          await createNewProject()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize'
        setInitError(message)
      } finally {
        setIsInitializing(false)
      }
    }

    async function createNewProject() {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: template.id,
            title: `${template.title} - ${new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
          }),
        })

        if (!response.ok) {
          // API might fail if user is not authenticated - continue without project persistence
          initWorkflow(template.id, template.workflow.steps)
          return
        }

        const data = await response.json()

        if (data.success && data.project) {
          initWorkflow(template.id, template.workflow.steps)
          setProjectId(data.project.id)

          // Update URL with projectId for persistence
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.set('projectId', data.project.id)
          router.replace(newUrl.pathname + newUrl.search, { scroll: false })
        } else {
          // Fallback: continue without persistence
          initWorkflow(template.id, template.workflow.steps)
        }
      } catch {
        // Fallback: continue without persistence
        initWorkflow(template.id, template.workflow.steps)
      }
    }

    initializeProject()
  }, [template.id, template.title, template.workflow.steps, projectIdParam, initWorkflow, setProjectId, restoreFromProject, router])

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
    // Remove projectId from URL and create fresh project
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('projectId')
    router.replace(newUrl.pathname + newUrl.search, { scroll: false })
    hasInitialized.current = false
  }

  // Loading state
  if (isInitializing || isRestoring) {
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

        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/10 bg-[#1a1a1a]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            <p className="text-white/60">
              {isRestoring ? '프로젝트 복원 중...' : '프로젝트 초기화 중...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (initError) {
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

        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-[#1a1a1a]">
          <p className="text-red-400">{initError}</p>
          <Button
            variant="outline"
            onClick={() => {
              hasInitialized.current = false
              setInitError(null)
              setIsInitializing(true)
            }}
            className="border-white/30 bg-transparent text-white hover:bg-white/10"
          >
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  // Result state (generating, completed, failed)
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

  // Save status indicator
  const SaveStatusIndicator = () => {
    if (!projectId) return null

    return (
      <div className="flex items-center gap-2 text-xs text-white/40">
        {isSaving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>저장 중...</span>
          </>
        ) : lastSavedAt ? (
          <>
            <Cloud className="h-3 w-3" />
            <span>저장됨</span>
          </>
        ) : (
          <>
            <CloudOff className="h-3 w-3" />
            <span>저장 안됨</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/templates/${template.id}`}
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {template.title}
        </Link>
        <SaveStatusIndicator />
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
            projectId={projectId}
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
