'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { AiGenerateStepConfig, MediaType } from '@vibe-media-lab/shared'

interface GeneratedResult {
  url: string
  generatedAt: Date
}

interface AiGenerateStepProps {
  stepId: string
  label: string
  description?: string
  config: AiGenerateStepConfig
  value: GeneratedResult | null
  onChange: (value: GeneratedResult | null) => void
  inputContext?: Record<string, unknown>
}

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  image: '이미지',
  video: '비디오',
  tts: '음성',
  bgm: 'BGM',
}

export function AiGenerateStep({
  stepId,
  label,
  description,
  config,
  value,
  onChange,
  inputContext,
}: AiGenerateStepProps) {
  const [status, setStatus] = React.useState<
    'idle' | 'generating' | 'success' | 'error'
  >('idle')
  const [error, setError] = React.useState<string | null>(null)

  const handleGenerate = async () => {
    setStatus('generating')
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const result: GeneratedResult = {
        url: `/generated/${stepId}-${Date.now()}.mp3`,
        generatedAt: new Date(),
      }

      onChange(result)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }

  const handleSkip = () => {
    onChange(null)
  }

  const mediaTypeLabel = MEDIA_TYPE_LABELS[config.mediaType]

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium text-white">{label}</Label>
        {description && (
          <p className="mt-1 text-sm text-white/60">{description}</p>
        )}
      </div>

      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-xl p-8',
          'border-2 border-dashed border-white/30 bg-white/5'
        )}
      >
        {status === 'idle' && !value && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-neon-pink)]/20 to-[var(--color-neon-cyan)]/20">
              <Sparkles className="h-8 w-8 text-[var(--color-neon-pink)]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-white">AI {mediaTypeLabel} 생성</p>
              <p className="mt-1 text-sm text-white/60">
                버튼을 클릭하면 AI가 {mediaTypeLabel}을 생성합니다
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                생성하기
              </Button>
              {!config.autoGenerate && (
                <Button variant="outline" onClick={handleSkip} className="border-white/30 bg-transparent text-white hover:bg-white/10">
                  건너뛰기
                </Button>
              )}
            </div>
          </>
        )}

        {status === 'generating' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[var(--color-neon-pink)]" />
            <div className="text-center">
              <p className="font-medium text-white">생성 중...</p>
              <p className="mt-1 text-sm text-white/60">
                AI가 {mediaTypeLabel}을 생성하고 있습니다
              </p>
            </div>
          </>
        )}

        {(status === 'success' || value) && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-neon-lime)]/20">
              <Check className="h-8 w-8 text-[var(--color-neon-lime)]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-white">생성 완료!</p>
              <p className="mt-1 text-sm text-white/60">
                {mediaTypeLabel}이 성공적으로 생성되었습니다
              </p>
            </div>
            <Button variant="outline" onClick={handleGenerate} className="border-white/30 bg-transparent text-white hover:bg-white/10">
              다시 생성하기
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-red-500">생성 실패</p>
              <p className="mt-1 text-sm text-white/60">
                {error || '다시 시도해주세요'}
              </p>
            </div>
            <Button onClick={handleGenerate}>다시 시도</Button>
          </>
        )}
      </div>

      {config.hint && (
        <p className="text-xs text-white/60">{config.hint}</p>
      )}
    </div>
  )
}
