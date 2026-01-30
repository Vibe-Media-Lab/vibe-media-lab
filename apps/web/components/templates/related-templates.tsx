'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Play, ArrowRight } from 'lucide-react'
import type { Template } from '@vibe-media-lab/shared'

interface RelatedTemplatesProps {
  templates: Template[]
}

export function RelatedTemplates({ templates }: RelatedTemplatesProps) {
  if (templates.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">관련 템플릿</h2>
        <Link
          href="/templates"
          className="flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          전체 보기
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {templates.map((template) => (
          <RelatedTemplateCard key={template.id} template={template} />
        ))}
      </div>
    </section>
  )
}

function RelatedTemplateCard({ template }: { template: Template }) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    videoRef.current?.play()
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
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-pink)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <article className="relative">
        <div
          className={cn(
            'relative aspect-[9/16] overflow-hidden rounded-xl',
            'bg-white/10 ring-1 ring-white/10',
            'transition-all duration-200',
            'group-hover:ring-2 group-hover:ring-[var(--color-neon-pink)]/50'
          )}
        >
          <video
            ref={videoRef}
            src={template.video}
            poster={template.poster}
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'transition-opacity duration-200',
              isHovered ? 'opacity-0' : 'opacity-100'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <Play className="h-4 w-4 fill-white text-white" />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="text-sm font-medium text-white line-clamp-1">
              {template.title}
            </h3>
            <p className="mt-0.5 text-xs text-white/60 line-clamp-1">
              {template.description}
            </p>
          </div>
        </div>
      </article>
    </Link>
  )
}
