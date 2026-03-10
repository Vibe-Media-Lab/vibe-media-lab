'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Grid3X3,
  Smartphone,
  Film,
  Music,
  GraduationCap,
  Sparkles,
  Baby,
  User,
} from 'lucide-react'
import { TEMPLATE_CATEGORIES } from '@/lib/data/templates'

const ICONS = {
  grid: Grid3X3,
  smartphone: Smartphone,
  film: Film,
  music: Music,
  'graduation-cap': GraduationCap,
  sparkles: Sparkles,
  baby: Baby,
  user: User,
} as const

interface CategoryFilterProps {
  selected: string
  onSelect: (category: string) => void
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TEMPLATE_CATEGORIES.map((category) => {
        const Icon = ICONS[category.icon]
        const isSelected = selected === category.id

        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2',
              'text-sm font-medium transition-all duration-200',
              'border',
              isSelected
                ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/10 text-[var(--color-neon-pink)]'
                : 'border-white/30 text-white/60 hover:border-white/50 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{category.label}</span>
          </button>
        )
      })}
    </div>
  )
}
