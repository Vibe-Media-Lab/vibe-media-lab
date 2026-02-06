'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  KidsStoryData,
  KidsZootopiaPlot,
  KidsBasicPlot,
} from '../types'
import { unwrapApiData } from '@/lib/api/kids-animation/types'

// Format story object to markdown (supports both legacy and enhanced Zootopia format)
function formatStoryToMarkdown(storyResponse: unknown): string {
  // Unwrap nested API response: { success, data: { sessionId, story }, meta }
  const unwrapped = unwrapApiData<{ story?: KidsStoryData } | KidsStoryData>(storyResponse)

  // Handle { sessionId, story } structure
  const story = unwrapped && typeof unwrapped === 'object' && 'story' in unwrapped
    ? (unwrapped as { story?: KidsStoryData }).story
    : (unwrapped as KidsStoryData)

  if (!story || typeof story !== 'object') {
    return typeof storyResponse === 'string'
      ? storyResponse
      : JSON.stringify(storyResponse, null, 2)
  }

  // Check if it's enhanced Zootopia format
  const plot = story.plot
  const isEnhanced =
    story.characters &&
    Array.isArray(story.characters) &&
    plot &&
    'hook' in plot

  if (isEnhanced && plot) {
    // Enhanced Zootopia Protocol format
    const zootopiaPlot = plot as KidsZootopiaPlot

    let charactersSection = ''
    if (story.characters && story.characters.length > 0) {
      charactersSection = `\n## 캐릭터\n${story.characters
        .map(
          (c) =>
            `### ${c.name} (${c.role === 'protagonist_a' ? '주인공' : c.role === 'protagonist_b' ? '파트너' : c.role === 'villain' ? '적대자' : '조연'})\n- **종류**: ${c.species}\n- **성격**: ${c.personality}\n- **외형**: ${c.visualDescription}`
        )
        .join('\n\n')}`
    }

    let settingSection = ''
    if (story.setting) {
      settingSection = `\n## 세계관\n- **배경**: ${story.setting.world}\n- **주요 장소**: ${story.setting.mainLocations?.join(', ') || ''}\n- **분위기**: ${story.setting.atmosphere}`
    }

    return `# ${story.title || '제목 없음'}

## 교훈
${story.lesson || ''}

## 줄거리
${story.synopsis || ''}
${charactersSection}
${settingSection}

## 6-Act 스토리 구조

### 🌟 Act 1: ${zootopiaPlot.hook?.title || 'Hook'}
**감정**: ${zootopiaPlot.hook?.emotion || 'hopeful'}
${zootopiaPlot.hook?.narration || ''}

### 🤝 Act 2: ${zootopiaPlot.duo?.title || 'Duo'}
**감정**: ${zootopiaPlot.duo?.emotion || 'surprised'}
${zootopiaPlot.duo?.narration || ''}

### 🚀 Act 3: ${zootopiaPlot.journey?.title || 'Journey'}
**감정**: ${zootopiaPlot.journey?.emotion || 'adventurous'}
${zootopiaPlot.journey?.narration || ''}

### ⚡ Act 4: ${zootopiaPlot.twist?.title || 'Twist'}
**감정**: ${zootopiaPlot.twist?.emotion || 'sad'}
${zootopiaPlot.twist?.narration || ''}

### 💪 Act 5: ${zootopiaPlot.action?.title || 'Action'}
**감정**: ${zootopiaPlot.action?.emotion || 'brave'}
${zootopiaPlot.action?.narration || ''}

### 🎉 Act 6: ${zootopiaPlot.resolution?.title || 'Resolution'}
**감정**: ${zootopiaPlot.resolution?.emotion || 'joyful'}
${zootopiaPlot.resolution?.narration || ''}`
  }

  // Legacy format
  const legacyPlot = story.plot as KidsBasicPlot | undefined

  return `# ${story.title || '제목 없음'}

## 교훈
${story.lesson || ''}

## 줄거리
${story.synopsis || ''}

### 1. 도입
${legacyPlot?.opening || ''}

### 2. 발단
${legacyPlot?.incitingIncident || ''}

### 3. 전개
${legacyPlot?.risingAction || ''}

### 4. 절정
${legacyPlot?.climax || ''}

### 5. 하강
${legacyPlot?.fallingAction || ''}

### 6. 결말
${legacyPlot?.resolution || ''}`
}

interface TextPreviewProps {
  data: unknown
  editable?: boolean
  onEdit?: (data: unknown) => void
}

export function TextPreview({ data, editable, onEdit }: TextPreviewProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const formattedData = formatStoryToMarkdown(data)
  const [editedData, setEditedData] = React.useState(formattedData)

  React.useEffect(() => {
    setEditedData(formatStoryToMarkdown(data))
  }, [data])

  const handleSave = () => {
    onEdit?.(editedData)
    setIsEditing(false)
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/60">스토리</span>
        {editable && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 text-white/60 hover:text-white"
          >
            <Edit3 className="mr-1 h-3 w-3" />
            수정
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editedData}
            onChange={(e) => setEditedData(e.target.value)}
            className={cn(
              'min-h-[200px] w-full rounded-lg border border-white/30',
              'bg-white/5 p-4 text-sm text-white',
              'focus:border-[var(--color-neon-pink)] focus:outline-none'
            )}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditedData(formattedData)
                setIsEditing(false)
              }}
              className="border-white/30 bg-transparent text-white"
            >
              취소
            </Button>
            <Button size="sm" onClick={handleSave}>
              저장
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'max-h-[400px] overflow-y-auto rounded-lg',
            'bg-white/5 p-4 text-sm leading-relaxed text-white/80'
          )}
        >
          <pre className="whitespace-pre-wrap font-sans">{formattedData}</pre>
        </div>
      )}
    </div>
  )
}
