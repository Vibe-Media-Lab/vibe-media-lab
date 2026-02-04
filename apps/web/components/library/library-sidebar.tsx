'use client'

import { cn } from '@/lib/utils'
import { ImageIcon, VideoIcon, LayoutGrid } from 'lucide-react'

export interface MediaCounts {
  all: number
  image: number
  video: number
}

export type MediaFilter = 'all' | 'image' | 'video'

interface LibrarySidebarProps {
  counts: MediaCounts
  activeFilter: MediaFilter
  onFilterChange: (filter: MediaFilter) => void
}

const FILTER_OPTIONS: Array<{
  key: MediaFilter
  label: string
  icon: React.ElementType
  countKey: keyof MediaCounts
}> = [
  { key: 'all', label: 'All', icon: LayoutGrid, countKey: 'all' },
  { key: 'image', label: 'Image', icon: ImageIcon, countKey: 'image' },
  { key: 'video', label: 'Video', icon: VideoIcon, countKey: 'video' },
]

export function LibrarySidebar({
  counts,
  activeFilter,
  onFilterChange,
}: LibrarySidebarProps) {
  return (
    <aside className="w-48 shrink-0">
      <nav className="space-y-1">
        {FILTER_OPTIONS.map(({ key, label, icon: Icon, countKey }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
              activeFilter === key
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <span
              className={cn(
                'text-xs tabular-nums',
                activeFilter === key ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {counts[countKey]}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
