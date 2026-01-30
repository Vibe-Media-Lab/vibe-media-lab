'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Clock, Zap, Eye, ChevronRight, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Template, TemplateDifficulty } from '@vibe-media-lab/shared'

interface TemplateInfoProps {
  template: Template
}

const DIFFICULTY_LABELS: Record<TemplateDifficulty, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

const DIFFICULTY_COLORS: Record<TemplateDifficulty, string> = {
  easy: 'text-[var(--color-neon-lime)]',
  medium: 'text-[var(--color-neon-cyan)]',
  hard: 'text-[var(--color-neon-pink)]',
}

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  shorts: 'Shorts',
}

export function TemplateInfo({ template }: TemplateInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{template.title}</h1>
        <p className="mt-2 text-white/60">
          {template.longDescription || template.description}
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2 text-white/60">
          <Eye className="h-4 w-4" />
          <span>{template.views} views</span>
        </div>

        <div className="flex items-center gap-2 text-white/60">
          <Clock className="h-4 w-4" />
          <span>{template.estimatedTime}</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-2',
            DIFFICULTY_COLORS[template.difficulty]
          )}
        >
          <Zap className="h-4 w-4" />
          <span>{DIFFICULTY_LABELS[template.difficulty]}</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/60">플랫폼</h3>
        <div className="flex flex-wrap gap-2">
          {template.platforms.map((platform) => (
            <span
              key={platform}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white"
            >
              <Smartphone className="h-3 w-3" />
              {PLATFORM_ICONS[platform]}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/60">태그</h3>
        <div className="flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/60"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/60">
          워크플로우 스텝
        </h3>
        <div className="space-y-2">
          {template.workflow.steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-3 rounded-lg bg-white/5 p-3"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-neon-pink)]/20 text-xs font-medium text-[var(--color-neon-pink)]">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{step.label}</p>
                {step.description && (
                  <p className="text-xs text-white/60 line-clamp-1">
                    {step.description}
                  </p>
                )}
              </div>
              {step.required && (
                <span className="shrink-0 text-[10px] text-[var(--color-neon-pink)]">
                  필수
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <Button
          asChild
          size="lg"
          className="w-full bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)] text-white hover:opacity-90"
        >
          <Link href={`/templates/${template.id}/workflow`}>
            Start Creating
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
