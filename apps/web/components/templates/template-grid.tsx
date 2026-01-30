'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { TemplateCard } from './template-card'
import type { Template } from '@vibe-media-lab/shared'

interface TemplateGridProps {
  templates: Template[]
  className?: string
}

export function TemplateGrid({ templates, className }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-white/60">해당 카테고리에 템플릿이 없습니다.</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
        className
      )}
    >
      {templates.map((template, index) => (
        <TemplateCard
          key={template.id}
          template={template}
          priority={index < 6}
        />
      ))}
    </div>
  )
}
