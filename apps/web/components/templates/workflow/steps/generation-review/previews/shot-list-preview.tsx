'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Edit3, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Shot, AnchorPrompt, ScriptData } from '../types'
import { unwrapApiData } from '@/lib/workflow/helpers'

interface ShotListPreviewProps {
  data: unknown
  editable?: boolean
  onEdit?: (data: unknown) => void
}

export function ShotListPreview({ data, editable, onEdit }: ShotListPreviewProps) {
  const [expandedShot, setExpandedShot] = React.useState<string | null>(null)
  const [editingField, setEditingField] = React.useState<{
    type: 'shot' | 'anchor' | 'bgm'
    id: string
    field: string
  } | null>(null)
  const [editValue, setEditValue] = React.useState('')

  // Extract data from API response format
  const response = unwrapApiData<ScriptData>(data)
  const shots = response?.script?.shots || response?.shots || []
  const bgmPrompt = response?.script?.bgmPrompt || response?.bgmPrompt || ''
  const anchorPrompts = response?.anchorPrompts || []

  const startEditing = (type: 'shot' | 'anchor' | 'bgm', id: string, field: string, currentValue: string) => {
    setEditingField({ type, id, field })
    setEditValue(currentValue)
  }

  const saveEdit = () => {
    if (!editingField || !onEdit) return

    const updatedData = JSON.parse(JSON.stringify(response))
    const targetShots = updatedData.script?.shots || updatedData.shots || []
    const targetAnchors = updatedData.anchorPrompts || []

    if (editingField.type === 'shot') {
      const shotIndex = targetShots.findIndex((s: Shot) => s.id === editingField.id)
      if (shotIndex !== -1) {
        targetShots[shotIndex][editingField.field] = editValue
      }
    } else if (editingField.type === 'anchor') {
      const anchorIndex = targetAnchors.findIndex((a: AnchorPrompt) => a.id === editingField.id)
      if (anchorIndex !== -1) {
        targetAnchors[anchorIndex].prompt = editValue
      }
    } else if (editingField.type === 'bgm') {
      if (updatedData.script) {
        updatedData.script.bgmPrompt = editValue
      } else {
        updatedData.bgmPrompt = editValue
      }
    }

    onEdit(updatedData)
    setEditingField(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  return (
    <div className="w-full space-y-4">
      {/* Anchor Prompts Section */}
      {anchorPrompts.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-white/60">
            앵커 이미지 프롬프트 ({anchorPrompts.length}개)
          </span>
          <div className="space-y-2">
            {anchorPrompts.map((anchor) => (
              <div
                key={anchor.id}
                className="rounded-lg border border-white/20 bg-white/5 p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      anchor.category === 'character'
                        ? 'bg-[var(--color-neon-pink)]/20 text-[var(--color-neon-pink)]'
                        : 'bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)]'
                    )}
                  >
                    {anchor.category === 'character' ? '캐릭터' : '배경'}
                  </span>
                  <span className="text-sm font-medium text-white">{anchor.name}</span>
                </div>
                {editingField?.type === 'anchor' && editingField.id === anchor.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full rounded-lg border border-white/30 bg-white/5 p-2 text-sm text-white focus:border-[var(--color-neon-pink)] focus:outline-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-white/60">
                        취소
                      </Button>
                      <Button size="sm" onClick={saveEdit}>
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'text-sm text-white/60',
                      editable && 'cursor-pointer hover:text-white/80'
                    )}
                    onClick={() => editable && startEditing('anchor', anchor.id, 'prompt', anchor.prompt)}
                  >
                    {anchor.prompt}
                    {editable && (
                      <Edit3 className="ml-1 inline h-3 w-3 text-white/40" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shots Section */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-white/60">
          샷 스크립트 ({shots.length}샷)
        </span>
        <div className="space-y-2">
          {shots.map((shot) => (
            <div
              key={shot.id}
              className={cn(
                'rounded-lg border border-white/20 bg-white/5',
                'overflow-hidden transition-all'
              )}
            >
              <button
                onClick={() =>
                  setExpandedShot(expandedShot === shot.id ? null : shot.id)
                }
                className="flex w-full items-center justify-between p-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      'bg-[var(--color-neon-pink)]/20 text-sm font-medium text-[var(--color-neon-pink)]'
                    )}
                  >
                    {shot.shotNumber}
                  </span>
                  <div>
                    <p className="text-sm text-white">
                      {shot.narration.slice(0, 50)}
                      {shot.narration.length > 50 && '...'}
                    </p>
                    <p className="text-xs text-white/40">{shot.duration}초</p>
                  </div>
                </div>
                {expandedShot === shot.id ? (
                  <ChevronUp className="h-4 w-4 text-white/40" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40" />
                )}
              </button>
              {expandedShot === shot.id && (
                <div className="border-t border-white/10 p-3 space-y-3">
                  {/* Narration */}
                  <div>
                    <span className="text-xs text-white/40">나레이션</span>
                    {editingField?.type === 'shot' && editingField.id === shot.id && editingField.field === 'narration' ? (
                      <div className="mt-1 space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded-lg border border-white/30 bg-white/5 p-2 text-sm text-white focus:border-[var(--color-neon-pink)] focus:outline-none"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-white/60">
                            취소
                          </Button>
                          <Button size="sm" onClick={saveEdit}>
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={cn(
                          'mt-1 text-sm text-white/80',
                          editable && 'cursor-pointer hover:text-white'
                        )}
                        onClick={() => editable && startEditing('shot', shot.id, 'narration', shot.narration)}
                      >
                        {shot.narration}
                        {editable && <Edit3 className="ml-1 inline h-3 w-3 text-white/40" />}
                      </p>
                    )}
                  </div>
                  {/* Visual Prompt */}
                  <div>
                    <span className="text-xs text-white/40">비주얼 프롬프트</span>
                    {editingField?.type === 'shot' && editingField.id === shot.id && editingField.field === 'visualPrompt' ? (
                      <div className="mt-1 space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded-lg border border-white/30 bg-white/5 p-2 text-sm text-white focus:border-[var(--color-neon-pink)] focus:outline-none"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-white/60">
                            취소
                          </Button>
                          <Button size="sm" onClick={saveEdit}>
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={cn(
                          'mt-1 text-sm text-white/60',
                          editable && 'cursor-pointer hover:text-white/80'
                        )}
                        onClick={() => editable && startEditing('shot', shot.id, 'visualPrompt', shot.visualPrompt)}
                      >
                        {shot.visualPrompt}
                        {editable && <Edit3 className="ml-1 inline h-3 w-3 text-white/40" />}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BGM Prompt Section */}
      {bgmPrompt && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-white/60">BGM 프롬프트</span>
          <div className="rounded-lg border border-white/20 bg-white/5 p-3">
            {editingField?.type === 'bgm' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-lg border border-white/30 bg-white/5 p-2 text-sm text-white focus:border-[var(--color-neon-pink)] focus:outline-none"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-white/60">
                    취소
                  </Button>
                  <Button size="sm" onClick={saveEdit}>
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={cn(
                  'text-sm text-white/60',
                  editable && 'cursor-pointer hover:text-white/80'
                )}
                onClick={() => editable && startEditing('bgm', 'bgm', 'bgmPrompt', bgmPrompt)}
              >
                {bgmPrompt}
                {editable && <Edit3 className="ml-1 inline h-3 w-3 text-white/40" />}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
