'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Volume2 } from 'lucide-react'
import type { AudioItem } from '../types'

interface AudioPlayerPreviewProps {
  data: AudioItem[]
  selectedBgmIndex?: number
  onSelectBgm?: (index: number) => void
}

export function AudioPlayerPreview({ data, selectedBgmIndex = 0, onSelectBgm }: AudioPlayerPreviewProps) {
  const [playingId, setPlayingId] = React.useState<string | null>(null)
  const audioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({})

  const handlePlayPause = (id: string) => {
    const audio = audioRefs.current[id]
    if (!audio) return

    if (playingId === id) {
      audio.pause()
      setPlayingId(null)
    } else {
      Object.values(audioRefs.current).forEach((a) => a?.pause())
      audio.play()
      setPlayingId(id)
    }
  }

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-white/60">
        오디오 ({data.length}개)
      </span>
      <div className="space-y-2">
        {data.map((item) => {
          const isSelected = item.isBgm && item.bgmIndex === selectedBgmIndex
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                item.isBgm && isSelected
                  ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/10'
                  : 'border-white/20 bg-white/5'
              )}
            >
              {/* BGM 선택 라디오 버튼 */}
              {item.isBgm && onSelectBgm && (
                <button
                  onClick={() => onSelectBgm(item.bgmIndex ?? 0)}
                  className={cn(
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                    isSelected
                      ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]'
                      : 'border-white/40 bg-transparent hover:border-white/60'
                  )}
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </button>
              )}
              <button
                onClick={() => handlePlayPause(item.id)}
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                  'bg-[var(--color-neon-pink)]/20 text-[var(--color-neon-pink)]'
                )}
              >
                {playingId === item.id ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {item.label}
                  {item.isBgm && isSelected && (
                    <span className="ml-2 text-xs text-[var(--color-neon-pink)]">선택됨</span>
                  )}
                </p>
                {item.duration && (
                  <p className="text-xs text-white/40">
                    {Math.floor(item.duration / 60)}:
                    {String(Math.floor(item.duration % 60)).padStart(2, '0')}
                  </p>
                )}
              </div>
              <Volume2 className="h-4 w-4 text-white/40" />
              <audio
                ref={(el) => {
                  audioRefs.current[item.id] = el
                }}
                src={item.url}
                onEnded={() => setPlayingId(null)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
