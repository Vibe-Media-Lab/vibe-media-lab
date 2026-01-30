import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTemplateById, getRelatedTemplates } from '@/lib/data/templates'
import { TemplateHero } from '@/components/templates/template-hero'
import { TemplateInfo } from '@/components/templates/template-info'
import { ExampleGallery } from '@/components/templates/example-gallery'
import { RelatedTemplates } from '@/components/templates/related-templates'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const template = getTemplateById(id)

  if (!template) {
    return {
      title: 'Template Not Found | VIBE Media Lab',
    }
  }

  return {
    title: `${template.title} | VIBE Media Lab`,
    description: template.longDescription || template.description,
  }
}

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params
  const template = getTemplateById(id)

  if (!template) {
    notFound()
  }

  const relatedTemplates = getRelatedTemplates(id)

  return (
    <main>
      <div className="mx-auto max-w-7xl px-2 py-8 sm:px-3 lg:px-4">
        <Link
          href="/templates"
          className="mb-6 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Templates
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
          <div className="space-y-8">
            <TemplateHero template={template} />

            {template.examples && template.examples.length > 0 && (
              <ExampleGallery examples={template.examples} />
            )}

            {relatedTemplates.length > 0 && (
              <RelatedTemplates templates={relatedTemplates} />
            )}
          </div>

          <aside className="lg:sticky lg:top-8 lg:h-fit">
            <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
              <TemplateInfo template={template} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
