'use client'

import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Play, Eye } from 'lucide-react'
import type { TemplateExample } from '@vibe-media-lab/shared'

interface ExampleGalleryProps {
  examples: TemplateExample[]
}

export function ExampleGallery({ examples }: ExampleGalleryProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null)

  if (examples.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white">예시 갤러리</h2>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {examples.map((example, index) => (
          <button
            key={example.id}
            onClick={() => setSelectedIndex(index)}
            className={cn(
              'group relative aspect-[9/16] overflow-hidden rounded-xl',
              'bg-white/10 ring-1 ring-white/10',
              'transition-all duration-200',
              'hover:ring-2 hover:ring-[var(--color-neon-pink)]/50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-pink)]'
            )}
          >
            <Image
              src={example.thumbnail}
              alt={`예시 ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
            </div>

            {example.views && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                <Eye className="h-3 w-3" />
                {example.views}
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedIndex !== null && examples[selectedIndex]?.video && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative aspect-[9/16] max-h-[80vh] w-full max-w-sm overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={examples[selectedIndex].video}
              autoPlay
              loop
              playsInline
              className="h-full w-full object-cover"
            />

            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              aria-label="닫기"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
