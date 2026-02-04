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

/**
 * API 응답에서 실제 데이터를 추출하는 헬퍼
 * createApiHandler가 { success, data: ... } 형태로 래핑하기 때문
 */
function unwrapApiResponse<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return (data as { success: boolean; data: T }).data
  }
  return data as T
}

/**
 * video-timeline용 데이터 추출
 * API 응답: { sessionId, shots: [...] } → VideoItem[] 변환
 */
function extractVideoItems(data: unknown): VideoItem[] {
  const unwrapped = unwrapApiResponse<{ shots?: unknown[] } | unknown[]>(data)

  // 이미 배열인 경우 (Mock 데이터)
  if (Array.isArray(unwrapped)) {
    return unwrapped as VideoItem[]
  }

  // { shots: [...] } 형태인 경우 (API 응답)
  if (unwrapped && typeof unwrapped === 'object' && 'shots' in unwrapped) {
    const shots = (unwrapped as { shots: unknown[] }).shots || []
    return shots.map((shot: unknown) => {
      const s = shot as { id: string; shotNumber?: number; videoUrl?: string; duration?: number }
      return {
        id: s.id,
        url: s.videoUrl || '',
        duration: s.duration || 5,
        label: s.shotNumber ? `Shot ${s.shotNumber}` : s.id,
      }
    })
  }

  return []
}

/**
 * audio-player용 데이터 추출
 * API 응답: { sessionId, tts: [{id, shotNumber, audioUrl, duration}, ...], bgmTracks: [{id, url, duration}, ...] }
 */
function extractAudioItems(data: unknown): AudioItem[] {
  const unwrapped = unwrapApiResponse<{
    tts?: Array<{ id: string; shotNumber?: number; audioUrl: string; duration?: number }>
    bgmTracks?: Array<{ id: string; url: string; duration: number; title?: string }>
  } | unknown[]>(data)

  // 이미 배열인 경우 (Mock 데이터)
  if (Array.isArray(unwrapped)) {
    return unwrapped as AudioItem[]
  }

  // API 응답 형태인 경우
  if (unwrapped && typeof unwrapped === 'object') {
    const items: AudioItem[] = []
    const resp = unwrapped as {
      tts?: Array<{ id: string; shotNumber?: number; audioUrl: string; duration?: number }>
      bgmTracks?: Array<{ id: string; url: string; duration: number; title?: string }>
    }

    // TTS 항목들 추가 (각 샷별 나레이션)
    if (resp.tts && Array.isArray(resp.tts)) {
      resp.tts.forEach((t, idx) => {
        items.push({
          id: t.id || `tts-${idx}`,
          url: t.audioUrl || '',
          label: t.shotNumber ? `나레이션 #${t.shotNumber}` : `나레이션 ${idx + 1}`,
          duration: t.duration,
        })
      })
    }

    // BGM 트랙들 추가 (Suno는 2개 트랙 생성)
    const bgmTracks = resp.bgmTracks
    if (bgmTracks && bgmTracks.length > 0) {
      bgmTracks.forEach((track, idx) => {
        items.push({
          id: track.id || `bgm-${idx}`,
          url: track.url,
          label: bgmTracks.length > 1 ? `BGM 옵션 ${idx + 1}` : 'BGM',
          duration: track.duration,
          isBgm: true,
          bgmIndex: idx,
        })
      })
    }

    return items
  }

  return []
}

export function Preview({ type, data, editable, onEdit, onRegenerateItem, onLikeItem, onDownloadItem, selectedBgmIndex, onSelectBgm }: PreviewProps) {
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
          onLikeItem={onLikeItem}
          onDownloadItem={onDownloadItem}
        />
      )
    case 'shot-gallery':
      return (
        <ShotGalleryPreview
          data={data}
          onRegenerateItem={onRegenerateItem}
          onLikeItem={onLikeItem}
          onDownloadItem={onDownloadItem}
        />
      )
    case 'video-timeline':
      return (
        <VideoTimelinePreview
          data={extractVideoItems(data)}
          onRegenerateItem={onRegenerateItem}
          onLikeItem={onLikeItem}
          onDownloadItem={onDownloadItem}
        />
      )
    case 'video-player': {
      // FinalResponse: { videoUrl, thumbnailUrl, totalDuration }
      const finalData = unwrapApiResponse<{
        videoUrl?: string
        url?: string
        thumbnailUrl?: string
        totalDuration?: number
      }>(data)
      return (
        <VideoPlayerPreview
          data={{
            url: finalData?.videoUrl || finalData?.url || '',
            thumbnailUrl: finalData?.thumbnailUrl,
            totalDuration: finalData?.totalDuration,
          }}
        />
      )
    }
    case 'audio-player':
      return (
        <AudioPlayerPreview
          data={extractAudioItems(data)}
          selectedBgmIndex={selectedBgmIndex}
          onSelectBgm={onSelectBgm}
        />
      )
    default:
      return (
        <div className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
          Unknown preview type: {type}
        </div>
      )
  }
}
