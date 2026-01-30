'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CategoryFilter } from '@/components/templates/category-filter'
import { TemplateGrid } from '@/components/templates/template-grid'
import { getTemplatesByCategory } from '@/lib/data/templates'

export function TemplatesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = searchParams.get('category') || 'all'

  const templates = React.useMemo(
    () => getTemplatesByCategory(category),
    [category]
  )

  const handleCategoryChange = (newCategory: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newCategory === 'all') {
      params.delete('category')
    } else {
      params.set('category', newCategory)
    }
    router.push(`/templates?${params.toString()}`)
  }

  return (
    <>
      <div className="mb-8">
        <CategoryFilter selected={category} onSelect={handleCategoryChange} />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-white/60">
            {templates.length}개의 템플릿
          </p>
        </div>

        <TemplateGrid templates={templates} />
      </section>
    </>
  )
}
