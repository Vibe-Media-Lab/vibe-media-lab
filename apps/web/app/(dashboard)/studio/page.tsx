'use client'

import { useState } from 'react'
import { ImageGenerator } from '@/components/studio/image-generator'
import { cn } from '@/lib/utils'

type MediaType = 'image' | 'video' | 'tts' | 'bgm'

const MEDIA_TYPES: { value: MediaType; label: string; description: string }[] = [
  { value: 'image', label: 'Image', description: 'AI 이미지 생성' },
  { value: 'video', label: 'Video', description: 'AI 비디오 생성' },
  { value: 'tts', label: 'TTS', description: '텍스트를 음성으로' },
  { value: 'bgm', label: 'BGM', description: 'AI 배경음악 생성' },
]

export default function StudioPage() {
  const [mediaType, setMediaType] = useState<MediaType>('image')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Studio</h1>
        <p className="text-muted-foreground">
          AI를 활용하여 다양한 미디어를 생성하세요
        </p>
      </div>

      {/* Media Type Selector */}
      <div className="flex gap-2">
        {MEDIA_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setMediaType(type.value)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors',
              mediaType === type.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <span className="font-medium">{type.label}</span>
            <span className="text-xs text-muted-foreground">
              {type.description}
            </span>
          </button>
        ))}
      </div>

      {/* Generator Component */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mediaType === 'image' && <ImageGenerator />}
        {mediaType === 'video' && (
          <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
            <p className="text-muted-foreground">Video 생성 기능 준비 중...</p>
          </div>
        )}
        {mediaType === 'tts' && (
          <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
            <p className="text-muted-foreground">TTS 기능 준비 중...</p>
          </div>
        )}
        {mediaType === 'bgm' && (
          <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
            <p className="text-muted-foreground">BGM 생성 기능 준비 중...</p>
          </div>
        )}
      </div>
    </div>
  )
}
