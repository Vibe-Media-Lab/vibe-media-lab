'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Upload, Copy, Check, AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GenerationResult } from './types'

interface ShotData {
  id: string
  shotNumber: number
  duration: number
  imageUrl: string
  visualPrompt: string
}

interface ManualVideoUploadProps {
  shots: ShotData[]
  sessionId: string
  onComplete: (result: GenerationResult) => void
}

type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error'

interface ShotUploadState {
  status: UploadStatus
  videoUrl: string
  error: string
  file: File | null
}

export function ManualVideoUpload({ shots, sessionId, onComplete }: ManualVideoUploadProps) {
  const [uploadStates, setUploadStates] = React.useState<Record<string, ShotUploadState>>(() => {
    const initial: Record<string, ShotUploadState> = {}
    for (const shot of shots) {
      initial[shot.id] = { status: 'idle', videoUrl: '', error: '', file: null }
    }
    return initial
  })
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [expandedPrompts, setExpandedPrompts] = React.useState<Set<string>>(new Set())

  const completedCount = Object.values(uploadStates).filter(s => s.status === 'uploaded').length
  const allCompleted = completedCount === shots.length

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyAllPrompts = async () => {
    const allPrompts = shots
      .map(s => `[Shot ${s.shotNumber}] (${s.duration}s)\n${s.visualPrompt}`)
      .join('\n\n---\n\n')
    await copyToClipboard(allPrompts, 'all')
  }

  const togglePrompt = (shotId: string) => {
    setExpandedPrompts(prev => {
      const next = new Set(prev)
      if (next.has(shotId)) next.delete(shotId)
      else next.add(shotId)
      return next
    })
  }

  const handleFileSelect = async (shotId: string, file: File) => {
    if (!file.type.startsWith('video/')) {
      setUploadStates(prev => ({
        ...prev,
        [shotId]: { ...prev[shotId]!, status: 'error', videoUrl: '', error: '비디오 파일만 업로드할 수 있습니다', file: null },
      }))
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      setUploadStates(prev => ({
        ...prev,
        [shotId]: { ...prev[shotId]!, status: 'error', videoUrl: '', error: '100MB 이하 파일만 업로드할 수 있습니다', file: null },
      }))
      return
    }

    setUploadStates(prev => ({
      ...prev,
      [shotId]: { status: 'uploading', videoUrl: '', error: '', file },
    }))

    const shot = shots.find(s => s.id === shotId)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('shotId', shotId)
    formData.append('shotNumber', String(shot?.shotNumber ?? 0))
    formData.append('sessionId', sessionId)
    formData.append('prompt', shot?.visualPrompt ?? '')

    try {
      const response = await fetch('/api/kids-animation/videos/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      const data = result.data ?? result

      if (data.success && data.videoUrl) {
        setUploadStates(prev => ({
          ...prev,
          [shotId]: { status: 'uploaded', videoUrl: data.videoUrl, error: '', file },
        }))
      } else {
        setUploadStates(prev => ({
          ...prev,
          [shotId]: { status: 'error', videoUrl: '', error: data.error || '업로드 실패', file },
        }))
      }
    } catch (err) {
      setUploadStates(prev => ({
        ...prev,
        [shotId]: { status: 'error', videoUrl: '', error: err instanceof Error ? err.message : '네트워크 오류', file },
      }))
    }
  }

  const handleDrop = (e: React.DragEvent, shotId: string) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(shotId, file)
  }

  const handleComplete = () => {
    const results = shots.map(shot => ({
      id: shot.id,
      shotNumber: shot.shotNumber,
      videoUrl: uploadStates[shot.id]?.videoUrl ?? '',
    }))

    onComplete({
      data: {
        success: true,
        data: { sessionId, shots: results },
      },
      generatedAt: new Date(),
    })
  }

  return (
    <div className="w-full space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">수동 비디오 업로드</h3>
          <p className="text-xs text-white/50">Hailuo 등에서 생성한 비디오를 샷별로 업로드하세요</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copyAllPrompts}
          className="border-white/20 bg-transparent text-white/70 hover:bg-white/10 text-xs"
        >
          {copiedId === 'all' ? <Check className="mr-1.5 h-3 w-3" /> : <Copy className="mr-1.5 h-3 w-3" />}
          전체 프롬프트 복사
        </Button>
      </div>

      {/* 샷 카드 그리드 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shots.map(shot => {
          const state = uploadStates[shot.id]!
          const isExpanded = expandedPrompts.has(shot.id)

          return (
            <div
              key={shot.id}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                state.status === 'uploaded'
                  ? 'border-[var(--color-neon-lime)]/40 bg-[var(--color-neon-lime)]/5'
                  : state.status === 'error'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-white/10 bg-white/5'
              )}
            >
              {/* 이미지 + 뱃지 */}
              <div className="group/img relative mb-2 aspect-video overflow-hidden rounded-md bg-black/30">
                {shot.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 외부 URL 이미지 (Supabase Storage)
                  <img
                    src={shot.imageUrl}
                    alt={`Shot ${shot.shotNumber}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/30 text-xs">
                    이미지 없음
                  </div>
                )}
                <div className="absolute left-1.5 top-1.5 flex gap-1">
                  <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    #{shot.shotNumber}
                  </span>
                  <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white/70">
                    {shot.duration}초
                  </span>
                </div>
                {shot.imageUrl && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(shot.imageUrl)
                        const blob = await res.blob()
                        const blobUrl = URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = blobUrl
                        link.download = `shot-${shot.shotNumber}.png`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        URL.revokeObjectURL(blobUrl)
                      } catch {
                        window.open(shot.imageUrl, '_blank')
                      }
                    }}
                    className="absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-white/70 opacity-0 transition-opacity hover:bg-black/80 hover:text-white group-hover/img:opacity-100"
                    title="이미지 다운로드"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* 프롬프트 */}
              <div className="mb-2">
                <div className="flex items-start justify-between gap-1">
                  <p className={cn('text-[11px] leading-relaxed text-white/60', !isExpanded && 'line-clamp-2')}>
                    {shot.visualPrompt}
                  </p>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      onClick={() => togglePrompt(shot.id)}
                      className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white/70"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(shot.visualPrompt, shot.id)}
                      className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white/70"
                    >
                      {copiedId === shot.id ? <Check className="h-3 w-3 text-[var(--color-neon-lime)]" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 업로드 영역 */}
              {state.status === 'uploaded' && state.videoUrl ? (
                <div className="space-y-1.5">
                  <video
                    src={state.videoUrl}
                    controls
                    className="w-full rounded-md"
                    style={{ maxHeight: '120px' }}
                  />
                  <button
                    onClick={() => setUploadStates(prev => ({
                      ...prev,
                      [shot.id]: { status: 'idle', videoUrl: '', error: '', file: null },
                    }))}
                    className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    다시 업로드
                  </button>
                </div>
              ) : (
                <label
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-3 transition-colors',
                    state.status === 'uploading'
                      ? 'border-[var(--color-neon-cyan)]/40 bg-[var(--color-neon-cyan)]/5'
                      : state.status === 'error'
                        ? 'border-red-500/30 hover:border-red-500/50'
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                  )}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, shot.id)}
                >
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleFileSelect(shot.id, f)
                    }}
                    disabled={state.status === 'uploading'}
                  />
                  {state.status === 'uploading' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--color-neon-cyan)]" />
                  ) : (
                    <Upload className="h-5 w-5 text-white/30" />
                  )}
                  <span className="mt-1 text-[10px] text-white/40">
                    {state.status === 'uploading' ? '업로드 중...' : '비디오 파일 선택 또는 드래그'}
                  </span>
                  {state.status === 'error' && (
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-red-400">
                      <AlertCircle className="h-2.5 w-2.5" />
                      {state.error}
                    </span>
                  )}
                </label>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단 */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-white/50">
          {completedCount}/{shots.length} 완료
        </span>
        <Button
          onClick={handleComplete}
          disabled={!allCompleted}
          className={cn(
            'transition-all',
            allCompleted
              ? 'bg-gradient-to-r from-[var(--color-neon-lime)] to-[var(--color-neon-cyan)]'
              : 'bg-white/10 text-white/30'
          )}
        >
          <Check className="mr-2 h-4 w-4" />
          완료
        </Button>
      </div>
    </div>
  )
}
