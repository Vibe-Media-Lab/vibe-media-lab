'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Clock, Zap } from 'lucide-react'
import type { Template, TemplateBadge, TemplateDifficulty } from '@vibe-media-lab/shared'

interface TemplateCardProps {
  template: Template
  priority?: boolean
}

const BADGE_STYLES: Record<TemplateBadge, string> = {
  HOT: 'bg-[var(--color-neon-pink)] text-white',
  NEW: 'bg-[var(--color-neon-cyan)] text-black',
  TRENDING: 'bg-[var(--color-neon-lime)] text-black',
}

const DIFFICULTY_LABELS: Record<TemplateDifficulty, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

export function TemplateCard({ template }: TemplateCardProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {
        // Ignore AbortError when play is interrupted by pause
      })
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  return (
    <Link
      href={`/templates/${template.id}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-pink)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <article className="relative">
        <div
          className={cn(
            'relative aspect-[9/16] overflow-hidden rounded-2xl',
            'bg-gradient-to-br from-white/10 to-white/5',
            'ring-1 ring-white/10',
            'transition-all duration-300',
            'group-hover:ring-2 group-hover:ring-[var(--color-neon-pink)]/50',
            'group-hover:shadow-[0_0_30px_rgba(244,37,140,0.3)]'
          )}
        >
          {/* Poster image - visible until video plays */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={template.poster}
            alt={template.title}
            width={320}
            height={569}
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              'transition-opacity duration-300',
              isHovered ? 'opacity-0' : 'opacity-100'
            )}
          />

          <video
            ref={videoRef}
            src={template.video}
            width={320}
            height={569}
            muted
            loop
            playsInline
            preload="none"
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              'transition-opacity duration-300',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {template.badge && (
            <span
              className={cn(
                'absolute left-3 top-3 z-10 rounded-full px-2.5 py-1',
                'text-[10px] font-bold uppercase tracking-wider',
                BADGE_STYLES[template.badge]
              )}
            >
              {template.badge}
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 z-10 p-4">
            <h3 className="font-semibold text-white">{template.title}</h3>
            <p className="mt-1 text-xs text-white/70 line-clamp-2">
              {template.description}
            </p>

            <div className="mt-3 flex items-center gap-3 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {template.estimatedTime}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {DIFFICULTY_LABELS[template.difficulty]}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {template.platforms.slice(0, 3).map((platform) => (
                <span
                  key={platform}
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
