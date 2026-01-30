'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Image,
  Video,
  Mic,
  Music,
  Captions,
  Sparkles,
} from 'lucide-react'

interface Tool {
  id: string
  label: string
  icon: React.ElementType
  color: string
  href: string
}

const TOOLS: Tool[] = [
  {
    id: 'image',
    label: 'Image Gen',
    icon: Image,
    color: 'var(--color-neon-pink)',
    href: '/studio?type=image',
  },
  {
    id: 'video',
    label: 'Video Gen',
    icon: Video,
    color: 'var(--color-neon-cyan)',
    href: '/studio?type=video',
  },
  {
    id: 'voice',
    label: 'Voice / TTS',
    icon: Mic,
    color: 'var(--color-neon-lime)',
    href: '/studio?type=voice',
  },
  {
    id: 'bgm',
    label: 'BGM / Music',
    icon: Music,
    color: 'var(--color-neon-purple)',
    href: '/studio?type=bgm',
  },
  {
    id: 'captions',
    label: 'Auto Captions',
    icon: Captions,
    color: 'var(--color-neon-pink)',
    href: '/studio?type=captions',
  },
  {
    id: 'workflow',
    label: 'Workflow',
    icon: Sparkles,
    color: 'var(--color-neon-cyan)',
    href: '/studio?type=workflow',
  },
]

export function ToolsSection() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40">
      <h2 className="mb-6 text-xl font-semibold">
        <span className="bg-gradient-to-r from-[var(--color-neon-lime)] to-[var(--color-neon-cyan)] bg-clip-text text-transparent">
          What will you create?
        </span>
      </h2>

      <div className="flex flex-wrap gap-3">
        {TOOLS.map((tool) => (
          <ToolPill key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  )
}

function ToolPill({ tool }: { tool: Tool }) {
  const Icon = tool.icon

  return (
    <a
      href={tool.href}
      className={cn(
        'group flex items-center gap-2.5 rounded-full',
        'border border-white/10 bg-white/5 px-4 py-2.5',
        'transition-[border-color,background-color,box-shadow] duration-300',
        'hover:border-white/20 hover:bg-white/10',
        'hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-black'
      )}
      style={
        {
          '--tool-color': tool.color,
        } as React.CSSProperties
      }
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          'bg-[var(--tool-color)]/20',
          'transition-colors duration-300',
          'group-hover:bg-[var(--tool-color)]/30'
        )}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: tool.color }}
          aria-hidden="true"
        />
      </span>
      <span className="text-sm font-medium text-white/80 group-hover:text-white">
        {tool.label}
      </span>
    </a>
  )
}
