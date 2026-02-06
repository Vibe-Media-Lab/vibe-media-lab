'use client'

import * as React from 'react'
import { AssetCard, type AssetItem } from './asset-card'

interface AssetGridProps {
  assets: AssetItem[]
  onFavoriteToggle?: (id: string) => void
  onDelete?: (id: string, hasProject: boolean) => void
}

export function AssetGrid({ assets, onFavoriteToggle, onDelete }: AssetGridProps) {
  if (assets.length === 0) {
    return null
  }

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4 space-y-4">
      {assets.map((asset) => (
        <div key={asset.id} className="break-inside-avoid">
          <AssetCard
            asset={asset}
            onFavoriteToggle={onFavoriteToggle}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  )
}
