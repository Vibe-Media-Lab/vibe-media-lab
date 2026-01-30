'use client'

import { Loader2 } from 'lucide-react'

interface VideoPlayerPreviewProps {
  data: { url: string }
}

export function VideoPlayerPreview({ data }: VideoPlayerPreviewProps) {
  return (
    <div className="w-full space-y-2">
      <span className="text-sm font-medium text-white/60">최종 영상</span>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        {data.url ? (
          <video
            src={data.url}
            controls
            className="h-full w-full"
            poster={`https://picsum.photos/seed/${Date.now()}/1280/720`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          </div>
        )}
      </div>
    </div>
  )
}
