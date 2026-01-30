import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'

export default async function GalleryPage() {
  let generations: Array<{
    id: string
    media_type: string
    prompt: string
    output_url: string | null
    provider: string
    model: string
    created_at: string
  }> = []

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data } = await supabase
        .from('media_generations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20)

      generations = data || []
    }
  } catch {
    // Supabase not configured
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gallery</h1>
        <p className="text-muted-foreground">
          생성한 미디어를 모아보세요
        </p>
      </div>

      {generations.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              아직 생성한 미디어가 없습니다. Studio에서 첫 번째 이미지를 생성해보세요!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generations.map((gen) => (
            <Card key={gen.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {gen.output_url ? (
                  <Image
                    src={gen.output_url}
                    alt={gen.prompt}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No preview</p>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <p className="text-sm line-clamp-2">{gen.prompt}</p>
                <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                  <span>{gen.provider} / {gen.model}</span>
                  <span>
                    {new Date(gen.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
