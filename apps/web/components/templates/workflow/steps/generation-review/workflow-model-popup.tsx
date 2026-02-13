'use client'

import * as React from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import type { ModelSelectionConfig } from '@vibe-media-lab/shared'
import { cn } from '@/lib/utils'
import { OptionRow } from '@/components/shared/model-option-row'

interface WorkflowModelPopupProps {
  config: ModelSelectionConfig
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  /** 접두사 라벨 (예: "TTS", "BGM") */
  label?: string
}

export function WorkflowModelPopup({ config, value, onChange, disabled, label }: WorkflowModelPopupProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const listRef = React.useRef<HTMLDivElement>(null)
  const focusedIndexRef = React.useRef(-1)

  const selectedOption = config.options.find(o => o.id === value)
  const displayLabel = selectedOption?.label || value

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return config.options
    const q = search.toLowerCase()
    return config.options.filter(
      o =>
        o.label.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q)),
    )
  }, [config.options, search])

  const featuredOptions = React.useMemo(
    () => filteredOptions.filter(o => o.featured),
    [filteredOptions],
  )
  const otherOptions = React.useMemo(
    () => filteredOptions.filter(o => !o.featured),
    [filteredOptions],
  )

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
    setSearch('')
    focusedIndexRef.current = -1
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')
    if (!items || items.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusedIndexRef.current = Math.min(focusedIndexRef.current + 1, items.length - 1)
      items[focusedIndexRef.current]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusedIndexRef.current = Math.max(focusedIndexRef.current - 1, 0)
      items[focusedIndexRef.current]?.focus()
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (document.activeElement?.getAttribute('role') === 'option') {
        e.preventDefault()
        ;(document.activeElement as HTMLButtonElement).click()
      }
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setSearch('')
      focusedIndexRef.current = -1
    } else {
      // Auto-focus selected item on open
      requestAnimationFrame(() => {
        const items = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')
        if (!items || items.length === 0) return
        const selectedIndex = filteredOptions.findIndex(o => o.id === value)
        focusedIndexRef.current = Math.max(0, selectedIndex)
        items[focusedIndexRef.current]?.focus()
      })
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label ? `${label} model: ${displayLabel}` : `Select model: ${displayLabel}`}
          className={cn(
            'flex h-9 items-center gap-1.5 rounded-md border px-4 text-sm font-medium transition-all',
            'border-[var(--color-neon-pink)]/30 bg-white/5 text-white/80',
            'hover:border-[var(--color-neon-pink)]/50 hover:bg-white/10 hover:text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {label && <span className="text-white/50">{label}:</span>}
          <span className="truncate max-w-[180px]">{displayLabel}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/40" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-80 p-0"
        onKeyDown={handleKeyDown}
      >
        {/* Search — 옵션 4개 이상일 때만 */}
        {config.options.length >= 4 && (
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  focusedIndexRef.current = -1
                }}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
              />
            </div>
          </div>
        )}

        {/* Model list */}
        <div ref={listRef} role="listbox" className="max-h-[320px] overflow-y-auto p-2">
          {/* Featured section */}
          {featuredOptions.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Featured
              </p>
              {featuredOptions.map((opt) => (
                <OptionRow
                  key={opt.id}
                  option={opt}
                  selected={value === opt.id}
                  onSelect={handleSelect}
                  role="option"
                  aria-selected={value === opt.id}
                />
              ))}
            </div>
          )}

          {/* All models section */}
          {otherOptions.length > 0 && (
            <div>
              {featuredOptions.length > 0 && (
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  All models
                </p>
              )}
              {otherOptions.map((opt) => (
                <OptionRow
                  key={opt.id}
                  option={opt}
                  selected={value === opt.id}
                  onSelect={handleSelect}
                  role="option"
                  aria-selected={value === opt.id}
                />
              ))}
            </div>
          )}

          {filteredOptions.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-white/40">
              일치하는 모델이 없습니다
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
