'use client'

interface DateGroupHeaderProps {
  label: string
  itemCount: number
}

export function DateGroupHeader({ label, itemCount }: DateGroupHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <span className="text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>
    </div>
  )
}
