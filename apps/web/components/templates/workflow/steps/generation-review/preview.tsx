'use client'

import type { PreviewProps, VideoItem, AudioItem } from './types'
import {
  TextPreview,
  ShotListPreview,
  ImageGridPreview,
  ShotGalleryPreview,
  VideoTimelinePreview,
  VideoPlayerPreview,
  AudioPlayerPreview,
} from './previews'

export function Preview({ type, data, editable, onEdit, onRegenerateItem }: PreviewProps) {
  switch (type) {
    case 'text':
      return (
        <TextPreview
          data={data}
          editable={editable}
          onEdit={onEdit}
        />
      )
    case 'shot-list':
      return (
        <ShotListPreview data={data} editable={editable} onEdit={onEdit} />
      )
    case 'image-grid':
      return (
        <ImageGridPreview
          data={data}
          onRegenerateItem={onRegenerateItem}
        />
      )
    case 'shot-gallery':
      return (
        <ShotGalleryPreview
          data={data}
          onRegenerateItem={onRegenerateItem}
        />
      )
    case 'video-timeline':
      return (
        <VideoTimelinePreview
          data={data as VideoItem[]}
          onRegenerateItem={onRegenerateItem}
        />
      )
    case 'video-player':
      return <VideoPlayerPreview data={data as { url: string }} />
    case 'audio-player':
      return <AudioPlayerPreview data={data as AudioItem[]} />
    default:
      return (
        <div className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
          Unknown preview type: {type}
        </div>
      )
  }
}
