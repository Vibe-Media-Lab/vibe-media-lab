'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface LibraryHeaderProps {
  search: string
  onSearchChange: (value: string) => void
  totalCount: number
}

export function LibraryHeader({
  search,
  onSearchChange,
  totalCount,
}: LibraryHeaderProps) {
  const [localSearch, setLocalSearch] = React.useState(search)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      onSearchChange(value)
    }, 300)
  }

  const handleClear = () => {
    setLocalSearch('')
    onSearchChange('')
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">All assets</h1>
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search assets..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {localSearch && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
