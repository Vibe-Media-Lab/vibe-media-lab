'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Edit3, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  KidsStoryData,
  KidsZootopiaPlot,
  KidsBasicPlot,
  KidsCharacterData,
} from '../types'
import { unwrapApiData } from '@/lib/workflow/helpers'

// ============================================================
// Helpers
// ============================================================

type StoryWrapper = { story?: KidsStoryData } | KidsStoryData

function extractStory(data: unknown): KidsStoryData | null {
  const unwrapped = unwrapApiData<StoryWrapper>(data)
  if (!unwrapped || typeof unwrapped !== 'object') return null
  if ('story' in unwrapped && unwrapped.story) return unwrapped.story as KidsStoryData
  if ('title' in unwrapped || 'plot' in unwrapped) return unwrapped as KidsStoryData
  return null
}

function isZootopiaPlot(plot: unknown): plot is KidsZootopiaPlot {
  return !!plot && typeof plot === 'object' && 'hook' in plot
}

const ZOOTOPIA_ACTS = [
  { key: 'hook', emoji: '\uD83C\uDF1F', label: 'Hook' },
  { key: 'duo', emoji: '\uD83E\uDD1D', label: 'Duo' },
  { key: 'journey', emoji: '\uD83D\uDE80', label: 'Journey' },
  { key: 'twist', emoji: '\u26A1', label: 'Twist' },
  { key: 'action', emoji: '\uD83D\uDCAA', label: 'Action' },
  { key: 'resolution', emoji: '\uD83C\uDF89', label: 'Resolution' },
] as const

const LEGACY_ACTS = [
  { key: 'opening', label: '1. \uB3C4\uC785' },
  { key: 'incitingIncident', label: '2. \uBC1C\uB2E8' },
  { key: 'risingAction', label: '3. \uC804\uAC1C' },
  { key: 'climax', label: '4. \uC808\uC815' },
  { key: 'fallingAction', label: '5. \uD558\uAC15' },
  { key: 'resolution', label: '6. \uACB0\uB9D0' },
] as const

// ============================================================
// Inline Editable Field
// ============================================================

function EditableField({
  label,
  value,
  editable,
  multiline = false,
  onSave,
}: {
  label: string
  value: string
  editable?: boolean
  multiline?: boolean
  onSave: (newValue: string) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(value)

  React.useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/40">{label}</span>
        {multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={4}
            className={cn(
              'w-full rounded-lg border border-white/30',
              'bg-white/5 p-3 text-sm text-white',
              'focus:border-[var(--color-neon-pink)] focus:outline-none'
            )}
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className={cn(
              'w-full rounded-lg border border-white/30',
              'bg-white/5 px-3 py-2 text-sm text-white',
              'focus:border-[var(--color-neon-pink)] focus:outline-none'
            )}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditValue(value); setIsEditing(false) }}
            className="text-white/60"
          >
            취소
          </Button>
          <Button size="sm" onClick={handleSave}>저장</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <span className="text-xs font-medium text-white/40">{label}</span>
      <div
        className={cn(
          'mt-1 text-sm text-white/80 whitespace-pre-wrap',
          editable && 'cursor-pointer rounded-lg p-2 -m-2 hover:bg-white/5 transition-colors group'
        )}
        onClick={() => editable && setIsEditing(true)}
      >
        {value || <span className="text-white/30 italic">비어있음</span>}
        {editable && (
          <Edit3 className="ml-1 inline h-3 w-3 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  )
}

// ============================================================
// TextPreview (field-by-field editing)
// ============================================================

interface TextPreviewProps {
  data: unknown
  editable?: boolean
  onEdit?: (data: unknown) => void
}

export function TextPreview({ data, editable, onEdit }: TextPreviewProps) {
  const [expandedSection, setExpandedSection] = React.useState<string | null>('plot')

  const story = extractStory(data)

  // 편집 시 원본 JSON 구조를 유지하면서 해당 필드만 업데이트
  const updateField = (path: string[], newValue: string) => {
    if (!onEdit || !story) return

    // deep clone
    const unwrapped = unwrapApiData<StoryWrapper>(data)
    const cloned = JSON.parse(JSON.stringify(unwrapped))

    // { story: {...} } 구조인지 직접 story인지 판별
    const target = cloned && typeof cloned === 'object' && 'story' in cloned
      ? cloned.story
      : cloned

    // path를 따라가서 필드 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: Record<string, any> = target
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i] as string
      if (!current[key]) current[key] = {}
      current = current[key]
    }
    const lastKey = path[path.length - 1] as string
    current[lastKey] = newValue

    onEdit(cloned)
  }

  // story가 없으면 raw fallback
  if (!story) {
    return (
      <div className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
        <pre className="whitespace-pre-wrap font-sans">
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      </div>
    )
  }

  const plot = story.plot
  const isEnhanced = isZootopiaPlot(plot)

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id)
  }

  return (
    <div className="w-full space-y-4 max-h-[500px] overflow-y-auto pr-1">
      {/* Title */}
      <EditableField
        label="제목"
        value={story.title || ''}
        editable={editable}
        onSave={(v) => updateField(['title'], v)}
      />

      {/* Lesson */}
      <EditableField
        label="교훈"
        value={story.lesson || ''}
        editable={editable}
        multiline
        onSave={(v) => updateField(['lesson'], v)}
      />

      {/* Synopsis */}
      <EditableField
        label="줄거리"
        value={story.synopsis || ''}
        editable={editable}
        multiline
        onSave={(v) => updateField(['synopsis'], v)}
      />

      {/* Characters (collapsible) */}
      {story.characters && story.characters.length > 0 && (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <button
            onClick={() => toggleSection('characters')}
            className="flex w-full items-center justify-between p-3 text-left hover:bg-white/5"
          >
            <span className="text-sm font-medium text-white/60">
              캐릭터 ({story.characters.length}명)
            </span>
            {expandedSection === 'characters'
              ? <ChevronUp className="h-4 w-4 text-white/40" />
              : <ChevronDown className="h-4 w-4 text-white/40" />}
          </button>
          {expandedSection === 'characters' && (
            <div className="space-y-3 p-3 pt-0">
              {story.characters.map((char: KidsCharacterData, idx: number) => (
                <div key={char.name} className="rounded-lg bg-white/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--color-neon-pink)]/20 px-2 py-0.5 text-xs font-medium text-[var(--color-neon-pink)]">
                      {char.role === 'protagonist_a' ? '주인공' : char.role === 'protagonist_b' ? '파트너' : char.role === 'villain' ? '적대자' : '조연'}
                    </span>
                    <EditableField
                      label="이름"
                      value={char.name}
                      editable={editable}
                      onSave={(v) => updateField(['characters', String(idx), 'name'], v)}
                    />
                  </div>
                  <EditableField
                    label="외형"
                    value={char.visualDescription}
                    editable={editable}
                    multiline
                    onSave={(v) => updateField(['characters', String(idx), 'visualDescription'], v)}
                  />
                  <EditableField
                    label="성격"
                    value={char.personality}
                    editable={editable}
                    onSave={(v) => updateField(['characters', String(idx), 'personality'], v)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Setting (collapsible) */}
      {story.setting && (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <button
            onClick={() => toggleSection('setting')}
            className="flex w-full items-center justify-between p-3 text-left hover:bg-white/5"
          >
            <span className="text-sm font-medium text-white/60">세계관</span>
            {expandedSection === 'setting'
              ? <ChevronUp className="h-4 w-4 text-white/40" />
              : <ChevronDown className="h-4 w-4 text-white/40" />}
          </button>
          {expandedSection === 'setting' && (
            <div className="space-y-2 p-3 pt-0">
              <EditableField
                label="배경"
                value={story.setting.world}
                editable={editable}
                onSave={(v) => updateField(['setting', 'world'], v)}
              />
              <EditableField
                label="분위기"
                value={story.setting.atmosphere}
                editable={editable}
                onSave={(v) => updateField(['setting', 'atmosphere'], v)}
              />
              <div>
                <span className="text-xs font-medium text-white/40">주요 장소</span>
                <div className="mt-1 text-sm text-white/80">
                  {story.setting.mainLocations?.join(', ') || '없음'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plot (collapsible) */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <button
          onClick={() => toggleSection('plot')}
          className="flex w-full items-center justify-between p-3 text-left hover:bg-white/5"
        >
          <span className="text-sm font-medium text-white/60">
            {isEnhanced ? '6-Act 스토리 구조' : '플롯'}
          </span>
          {expandedSection === 'plot'
            ? <ChevronUp className="h-4 w-4 text-white/40" />
            : <ChevronDown className="h-4 w-4 text-white/40" />}
        </button>
        {expandedSection === 'plot' && plot && (
          <div className="space-y-3 p-3 pt-0">
            {isEnhanced ? (
              // Zootopia 6-Act format
              ZOOTOPIA_ACTS.map(({ key, emoji, label }) => {
                const act = (plot as KidsZootopiaPlot)[key]
                if (!act) return null
                return (
                  <div key={key} className="rounded-lg bg-white/5 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <span>{emoji}</span>
                      <EditableField
                        label={`Act: ${label} - 제목`}
                        value={act.title || label}
                        editable={editable}
                        onSave={(v) => updateField(['plot', key, 'title'], v)}
                      />
                    </div>
                    <div className="text-xs text-white/40">
                      감정: {act.emotion || '—'}
                    </div>
                    <EditableField
                      label="나레이션"
                      value={act.narration || ''}
                      editable={editable}
                      multiline
                      onSave={(v) => updateField(['plot', key, 'narration'], v)}
                    />
                  </div>
                )
              })
            ) : (
              // Legacy format
              LEGACY_ACTS.map(({ key, label }) => (
                <EditableField
                  key={key}
                  label={label}
                  value={(plot as KidsBasicPlot)[key] || ''}
                  editable={editable}
                  multiline
                  onSave={(v) => updateField(['plot', key], v)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
