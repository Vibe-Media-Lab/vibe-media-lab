'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Upload, Copy, Check, Loader2, RefreshCw, Plus, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GenerationResult } from './types'

interface ShotNarration {
  id: string
  shotNumber: number
  narration: string
}

interface ManualAudioUploadProps {
  shots: ShotNarration[]
  bgmPrompt?: string
  sessionId: string
  onComplete: (result: GenerationResult) => void
}

type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error'

interface AudioUploadState {
  status: UploadStatus
  audioUrl: string
  duration: number
  error: string
  file: File | null
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.addEventListener('loadedmetadata', () => {
      const dur = audio.duration
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(dur) ? Math.round(dur * 10) / 10 : 0)
    })
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      resolve(0)
    })
    audio.src = url
  })
}

export function ManualAudioUpload({ shots, bgmPrompt, sessionId, onComplete }: ManualAudioUploadProps) {
  // TTS 상태
  const [ttsStates, setTtsStates] = React.useState<Record<string, AudioUploadState>>(() => {
    const initial: Record<string, AudioUploadState> = {}
    for (const shot of shots) {
      initial[shot.id] = { status: 'idle', audioUrl: '', duration: 0, error: '', file: null }
    }
    return initial
  })

  // BGM 상태 (최대 2개)
  const [bgmStates, setBgmStates] = React.useState<AudioUploadState[]>([
    { status: 'idle', audioUrl: '', duration: 0, error: '', file: null },
  ])

  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const ttsCompleted = Object.values(ttsStates).filter(s => s.status === 'uploaded').length
  const bgmCompleted = bgmStates.filter(s => s.status === 'uploaded').length
  const allTtsCompleted = ttsCompleted === shots.length
  const allCompleted = allTtsCompleted && bgmCompleted >= 1

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyAllNarrations = async () => {
    const all = shots
      .map(s => `[Shot ${s.shotNumber}]\n${s.narration}`)
      .join('\n\n---\n\n')
    await copyToClipboard(all, 'all-narrations')
  }

  // TTS 업로드
  const handleTtsUpload = async (shotId: string, file: File) => {
    if (!file.type.startsWith('audio/')) {
      setTtsStates(prev => ({
        ...prev,
        [shotId]: { ...prev[shotId]!, status: 'error', error: '오디오 파일만 업로드할 수 있습니다' },
      }))
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setTtsStates(prev => ({
        ...prev,
        [shotId]: { ...prev[shotId]!, status: 'error', error: '50MB 이하 파일만 업로드할 수 있습니다' },
      }))
      return
    }

    setTtsStates(prev => ({
      ...prev,
      [shotId]: { status: 'uploading', audioUrl: '', duration: 0, error: '', file },
    }))

    const shot = shots.find(s => s.id === shotId)
    const duration = await getAudioDuration(file)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'tts')
    formData.append('sessionId', sessionId)
    formData.append('shotId', shotId)
    formData.append('shotNumber', String(shot?.shotNumber ?? 0))
    formData.append('prompt', shot?.narration ?? '')

    try {
      const response = await fetch('/api/kids-animation/audio/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      const data = result.data ?? result

      if (data.success && data.audioUrl) {
        setTtsStates(prev => ({
          ...prev,
          [shotId]: { status: 'uploaded', audioUrl: data.audioUrl, duration, error: '', file },
        }))
      } else {
        setTtsStates(prev => ({
          ...prev,
          [shotId]: { status: 'error', audioUrl: '', duration: 0, error: data.error || '업로드 실패', file },
        }))
      }
    } catch (err) {
      setTtsStates(prev => ({
        ...prev,
        [shotId]: { status: 'error', audioUrl: '', duration: 0, error: err instanceof Error ? err.message : '네트워크 오류', file },
      }))
    }
  }

  // BGM 업로드
  const handleBgmUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('audio/')) {
      setBgmStates(prev => prev.map((s, i) =>
        i === index ? { ...s, status: 'error' as const, error: '오디오 파일만 업로드할 수 있습니다' } : s
      ))
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setBgmStates(prev => prev.map((s, i) =>
        i === index ? { ...s, status: 'error' as const, error: '50MB 이하 파일만 업로드할 수 있습니다' } : s
      ))
      return
    }

    setBgmStates(prev => prev.map((s, i) =>
      i === index ? { status: 'uploading', audioUrl: '', duration: 0, error: '', file } : s
    ))

    const duration = await getAudioDuration(file)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'bgm')
    formData.append('sessionId', sessionId)
    formData.append('trackIndex', String(index))
    formData.append('prompt', bgmPrompt ?? '')

    try {
      const response = await fetch('/api/kids-animation/audio/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      const data = result.data ?? result

      if (data.success && data.audioUrl) {
        setBgmStates(prev => prev.map((s, i) =>
          i === index ? { status: 'uploaded' as const, audioUrl: data.audioUrl, duration, error: '', file } : s
        ))
      } else {
        setBgmStates(prev => prev.map((s, i) =>
          i === index ? { status: 'error' as const, audioUrl: '', duration: 0, error: data.error || '업로드 실패', file } : s
        ))
      }
    } catch (err) {
      setBgmStates(prev => prev.map((s, i) =>
        i === index ? { status: 'error' as const, audioUrl: '', duration: 0, error: err instanceof Error ? err.message : '네트워크 오류', file } : s
      ))
    }
  }

  const handleComplete = () => {
    const ttsResults = shots.map(shot => {
      const state = ttsStates[shot.id]!
      return {
        id: shot.id,
        shotNumber: shot.shotNumber,
        audioUrl: state.audioUrl,
        duration: state.duration,
      }
    })

    const bgmTracks = bgmStates
      .filter(s => s.status === 'uploaded' && s.audioUrl)
      .map((s, i) => ({
        id: `bgm-${i}`,
        url: s.audioUrl,
        duration: s.duration,
        title: `BGM ${i + 1}`,
      }))

    onComplete({
      data: {
        success: true,
        data: {
          sessionId,
          tts: ttsResults,
          bgmTracks,
        },
      },
      generatedAt: new Date(),
    })
  }

  return (
    <div className="w-full space-y-5">
      {/* TTS 섹션 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">나레이션 (TTS) 업로드</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAllNarrations}
            className="border-white/20 bg-transparent text-white/70 hover:bg-white/10 text-xs"
          >
            {copiedId === 'all-narrations' ? <Check className="mr-1.5 h-3 w-3" /> : <Copy className="mr-1.5 h-3 w-3" />}
            전체 나레이션 복사
          </Button>
        </div>

        <div className="space-y-2">
          {shots.map(shot => {
            const state = ttsStates[shot.id]!
            return (
              <div
                key={shot.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                  state.status === 'uploaded'
                    ? 'border-[var(--color-neon-lime)]/40 bg-[var(--color-neon-lime)]/5'
                    : state.status === 'error'
                      ? 'border-red-500/40 bg-red-500/5'
                      : 'border-white/10 bg-white/5'
                )}
              >
                {/* 샷 번호 */}
                <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70">
                  #{shot.shotNumber}
                </span>

                {/* 나레이션 텍스트 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1">
                    <p className="text-xs leading-relaxed text-white/60 line-clamp-2">{shot.narration}</p>
                    <button
                      onClick={() => copyToClipboard(shot.narration, `tts-${shot.id}`)}
                      className="shrink-0 rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white/70"
                    >
                      {copiedId === `tts-${shot.id}` ? (
                        <Check className="h-3 w-3 text-[var(--color-neon-lime)]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 업로드 영역 */}
                <div className="w-44 shrink-0">
                  {state.status === 'uploaded' && state.audioUrl ? (
                    <div className="space-y-1">
                      <audio src={state.audioUrl} controls className="h-7 w-full" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40">{state.duration}초</span>
                        <button
                          onClick={() => setTtsStates(prev => ({
                            ...prev,
                            [shot.id]: { status: 'idle', audioUrl: '', duration: 0, error: '', file: null },
                          }))}
                          className="flex items-center gap-0.5 text-[10px] text-white/40 hover:text-white/60"
                        >
                          <RefreshCw className="h-2.5 w-2.5" />
                          교체
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      className={cn(
                        'flex cursor-pointer flex-col items-center justify-center rounded border border-dashed px-2 py-2 transition-colors',
                        state.status === 'uploading'
                          ? 'border-[var(--color-neon-cyan)]/40 bg-[var(--color-neon-cyan)]/5'
                          : state.status === 'error'
                            ? 'border-red-500/30'
                            : 'border-white/20 hover:border-white/40'
                      )}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault()
                        const f = e.dataTransfer.files[0]
                        if (f) handleTtsUpload(shot.id, f)
                      }}
                    >
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) handleTtsUpload(shot.id, f)
                        }}
                        disabled={state.status === 'uploading'}
                      />
                      {state.status === 'uploading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-neon-cyan)]" />
                      ) : (
                        <Upload className="h-4 w-4 text-white/30" />
                      )}
                      <span className="mt-0.5 text-[10px] text-white/40">
                        {state.status === 'uploading' ? '업로드 중...' : '오디오 파일'}
                      </span>
                      {state.status === 'error' && (
                        <span className="mt-0.5 text-[10px] text-red-400">{state.error}</span>
                      )}
                    </label>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BGM 섹션 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">
            <Music className="mr-1.5 inline h-4 w-4" />
            BGM 업로드
          </h3>
          {bgmStates.length < 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBgmStates(prev => [
                ...prev,
                { status: 'idle', audioUrl: '', duration: 0, error: '', file: null },
              ])}
              className="border-white/20 bg-transparent text-white/70 hover:bg-white/10 text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              BGM 추가
            </Button>
          )}
        </div>

        {bgmPrompt && (
          <div className="flex items-start gap-2 rounded-md bg-white/5 px-3 py-2">
            <p className="flex-1 text-[11px] leading-relaxed text-white/50">{bgmPrompt}</p>
            <button
              onClick={() => copyToClipboard(bgmPrompt, 'bgm-prompt')}
              className="shrink-0 rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white/70"
            >
              {copiedId === 'bgm-prompt' ? (
                <Check className="h-3 w-3 text-[var(--color-neon-lime)]" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {bgmStates.map((state, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                state.status === 'uploaded'
                  ? 'border-[var(--color-neon-lime)]/40 bg-[var(--color-neon-lime)]/5'
                  : state.status === 'error'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-white/10 bg-white/5'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xs font-medium text-white/70">BGM {idx + 1}</span>

                <div className="flex-1">
                  {state.status === 'uploaded' && state.audioUrl ? (
                    <div className="flex items-center gap-2">
                      <audio src={state.audioUrl} controls className="h-7 flex-1" />
                      <span className="text-[10px] text-white/40">{state.duration}초</span>
                      <button
                        onClick={() => setBgmStates(prev => prev.map((s, i) =>
                          i === idx ? { status: 'idle', audioUrl: '', duration: 0, error: '', file: null } : s
                        ))}
                        className="flex items-center gap-0.5 text-[10px] text-white/40 hover:text-white/60"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        교체
                      </button>
                    </div>
                  ) : (
                    <label
                      className={cn(
                        'flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed px-3 py-2 transition-colors',
                        state.status === 'uploading'
                          ? 'border-[var(--color-neon-cyan)]/40 bg-[var(--color-neon-cyan)]/5'
                          : state.status === 'error'
                            ? 'border-red-500/30'
                            : 'border-white/20 hover:border-white/40'
                      )}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault()
                        const f = e.dataTransfer.files[0]
                        if (f) handleBgmUpload(idx, f)
                      }}
                    >
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) handleBgmUpload(idx, f)
                        }}
                        disabled={state.status === 'uploading'}
                      />
                      {state.status === 'uploading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-neon-cyan)]" />
                      ) : (
                        <Upload className="h-4 w-4 text-white/30" />
                      )}
                      <span className="text-[10px] text-white/40">
                        {state.status === 'uploading' ? '업로드 중...' : 'BGM 파일 선택 또는 드래그'}
                      </span>
                      {state.status === 'error' && (
                        <span className="text-[10px] text-red-400">{state.error}</span>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-white/50">
          TTS {ttsCompleted}/{shots.length} · BGM {bgmCompleted}/{bgmStates.length}
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
