'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { unwrapApiData } from '@/lib/workflow/helpers'
import type { CharacterProfile } from '@/lib/api/character/types'

interface CharacterQuickstartPreviewProps {
  data: unknown
  editable?: boolean
  onEdit?: (data: unknown) => void
}

interface ProfileData {
  profile?: CharacterProfile
}

export function CharacterQuickstartPreview({
  data,
  editable,
  onEdit,
}: CharacterQuickstartPreviewProps) {
  const response = unwrapApiData<ProfileData>(data)
  const profile = response?.profile

  if (!profile) {
    return (
      <div className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
        프로필 데이터가 없습니다
      </div>
    )
  }

  const handleFieldChange = (field: keyof CharacterProfile, value: string) => {
    if (!onEdit) return
    const updatedProfile = { ...profile, [field]: value }
    const updatedData = { ...response, profile: updatedProfile }
    onEdit(updatedData)
  }

  const fields: Array<{ key: keyof CharacterProfile; label: string; rows: number }> = [
    { key: 'name', label: '이름', rows: 1 },
    { key: 'personality', label: '성격', rows: 2 },
    { key: 'visualDescription', label: '외형 설명 (영문)', rows: 3 },
    { key: 'backstory', label: '배경 스토리', rows: 2 },
  ]

  return (
    <div className="w-full space-y-4">
      <span className="text-sm font-medium text-white/60">캐릭터 프로필</span>

      {/* SECURITY: profile 필드는 LLM 생성 데이터. text node / textarea value로만 렌더링.
          dangerouslySetInnerHTML 절대 사용 금지. */}
      <div className="space-y-3">
        {fields.map(({ key, label, rows }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-white/50">{label}</Label>
            {editable ? (
              <textarea
                value={profile[key] || ''}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                rows={rows}
                className={cn(
                  'w-full resize-none rounded-lg border border-white/20 bg-white/5 p-2.5',
                  'text-sm text-white placeholder:text-white/30',
                  'focus:border-[var(--color-neon-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)]'
                )}
              />
            ) : (
              <div className="rounded-lg bg-white/5 p-2.5 text-sm text-white/80">
                {profile[key] || '-'}
              </div>
            )}
          </div>
        ))}
      </div>

      {profile.archetype && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">아키타입:</span>
          <span className="rounded-full bg-[var(--color-neon-cyan)]/10 px-2 py-0.5 text-xs text-[var(--color-neon-cyan)]">
            {profile.archetype}
          </span>
        </div>
      )}
    </div>
  )
}
