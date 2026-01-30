'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Download,
  Share2,
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkflowStatus } from '@/lib/stores/workflow-store'

interface WorkflowResultProps {
  status: WorkflowStatus
  outputUrl: string | null
  error: string | null
  onReset: () => void
  onGenerate: () => void
}

export function WorkflowResult({
  status,
  outputUrl,
  error,
  onReset,
  onGenerate,
}: WorkflowResultProps) {
  const handleDownload = () => {
    if (outputUrl) {
      const link = document.createElement('a')
      link.href = outputUrl
      link.download = `vibe-output-${Date.now()}.mp4`
      link.click()
    }
  }

  const handleShare = async () => {
    if (outputUrl && navigator.share) {
      try {
        await navigator.share({
          title: 'VIBE Media Lab',
          text: 'Check out what I made with VIBE Media Lab!',
          url: outputUrl,
        })
      } catch {
        await navigator.clipboard.writeText(outputUrl)
      }
    }
  }

  if (status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-neon-pink)]/30" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-neon-pink)] to-[var(--color-neon-purple)]">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold text-white">영상 생성 중...</h3>
          <p className="mt-2 text-white/60">
            AI가 당신의 영상을 제작하고 있습니다
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-cyan)]" />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold text-red-500">생성 실패</h3>
          <p className="mt-2 text-white/60">
            {error || '영상 생성 중 오류가 발생했습니다'}
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={onGenerate}>다시 시도</Button>
          <Button variant="outline" onClick={onReset} className="border-white/30 bg-transparent text-white hover:bg-white/10">
            처음부터 다시
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'completed' && outputUrl) {
    return (
      <div className="flex flex-col items-center gap-6 py-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-neon-lime)]/20">
          <Check className="h-8 w-8 text-[var(--color-neon-lime)]" />
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold text-white">생성 완료!</h3>
          <p className="mt-1 text-white/60">
            영상이 성공적으로 생성되었습니다
          </p>
        </div>

        <div className="relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-white/10">
          <video
            src={outputUrl}
            controls
            autoPlay
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            다운로드
          </Button>

          <Button variant="outline" onClick={handleShare} className="border-white/30 bg-transparent text-white hover:bg-white/10">
            <Share2 className="mr-2 h-4 w-4" />
            공유하기
          </Button>

          <Button variant="ghost" onClick={onReset} className="text-white/60 hover:text-white hover:bg-white/10">
            <RotateCcw className="mr-2 h-4 w-4" />
            새로 만들기
          </Button>
        </div>
      </div>
    )
  }

  return null
}
