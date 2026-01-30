'use client'

import * as React from 'react'
import { useParams, notFound } from 'next/navigation'
import { getTemplateById } from '@/lib/data/templates'
import { WorkflowContainer } from '@/components/templates/workflow/workflow-container'

export default function WorkflowPage() {
  const params = useParams()
  const id = params.id as string

  const template = React.useMemo(() => getTemplateById(id), [id])

  if (!template) {
    notFound()
  }

  return (
    <main>
      <div className="mx-auto max-w-7xl px-2 py-8 sm:px-3 lg:px-4">
        <WorkflowContainer template={template} />
      </div>
    </main>
  )
}
