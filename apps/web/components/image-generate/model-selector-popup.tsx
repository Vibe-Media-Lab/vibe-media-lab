'use client'

import * as React from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { getModelSelectionConfig } from '@/lib/models/helpers'
import type { ModelSelectionConfig } from '@vibe-media-lab/shared'
import { cn } from '@/lib/utils'
import { OptionRow } from '@/components/shared/model-option-row'

interface ModelSelectorPopupProps {
  value: string
  onChange: (id: string) => void
  hasReferences: boolean
  disabled?: boolean
}

export function ModelSelectorPopup({ value, onChange, hasReferences, disabled }: ModelSelectorPopupProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const capability = hasReferences ? 'image-to-image' : 'text-to-image'
  const config: ModelSelectionConfig = React.useMemo(() => {
    try {
      return getModelSelectionConfig(capability as 'text-to-image' | 'image-to-image')
    } catch {
      return { category: capability, options: [], defaultModelId: '' }
    }
  }, [capability])

  const selectedOption = config.options.find(o => o.id === value)
  const label = selectedOption?.label || value

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
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-base font-medium transition-colors',
            'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <span className="truncate max-w-[120px]">{label}</span>
          <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        {/* Search */}
        <div className="border-b border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
            />
          </div>
        </div>

        {/* Model list */}
        <div className="max-h-[320px] overflow-y-auto p-2">
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
