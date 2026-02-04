'use client'

import * as React from 'react'
import Image from 'next/image'
import { Heart, Play, Pause, Trash2, Download, Music, Film, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AssetItem {
  id: string
  media_type: string
  prompt: string
  output_url: string | null
  thumbnail_url: string | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  is_favorite: boolean
  created_at: string
}

interface AssetCardProps {
  asset: AssetItem
  onFavoriteToggle?: (id: string) => void
  onDelete?: (id: string) => void
}

export function AssetCard({ asset, onFavoriteToggle, onDelete }: AssetCardProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = React.useState(false)
  const [audioCurrentTime, setAudioCurrentTime] = React.useState(0)
  const [audioDuration, setAudioDuration] = React.useState(0)
  const [videoCurrentTime, setVideoCurrentTime] = React.useState(0)
  const [videoDuration, setVideoDuration] = React.useState(0)

  const isVideo = asset.media_type === 'video'
  const isAudio = asset.media_type === 'audio' || asset.media_type === 'tts' || asset.media_type === 'bgm'
  const isImage = asset.media_type === 'image'

  // 이미지 URL인지 확인하는 헬퍼 (미디어 파일 확장자 제외)
  const isValidImageUrl = (url: string | null | undefined): url is string => {
    if (!url || url.length === 0 || !url.startsWith('http')) return false
    // 오디오/비디오 확장자는 이미지로 사용 불가
    const mediaExtensions = ['.mp3', '.mp4', '.wav', '.webm', '.ogg', '.m4a', '.aac']
    const lowerUrl = url.toLowerCase()
    if (mediaExtensions.some(ext => lowerUrl.includes(ext))) return false
    // musicfile 도메인은 이미지가 아님
    if (lowerUrl.includes('musicfile.kie.ai')) return false
    return true
  }

  // 썸네일 URL 결정: 항상 유효한 이미지 URL만 사용
  const getThumbnailUrl = (): string | null => {
    if (isValidImageUrl(asset.thumbnail_url)) return asset.thumbnail_url
    if (isImage && isValidImageUrl(asset.output_url)) return asset.output_url
    return null
  }

  const thumbnailUrl = getThumbnailUrl()
  const hasThumbnail = thumbnailUrl !== null

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onFavoriteToggle?.(asset.id)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(asset.id)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!asset.output_url) return

    const link = document.createElement('a')
    link.href = asset.output_url
    const ext = isVideo ? 'mp4' : isAudio ? 'mp3' : 'png'
    link.download = `vibe-${asset.media_type}-${Date.now()}.${ext}`
    link.click()
  }

  const handleVideoPlayPause = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play().catch(() => {
        // Ignore play errors
      })
      setIsPlaying(true)
    }
  }

  const handleVideoSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!videoRef.current || !videoDuration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    videoRef.current.currentTime = percentage * videoDuration
  }

  const handleAudioPlayPause = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!audioRef.current) return

    if (isAudioPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {
        // Ignore play errors
      })
    }
  }

  const handleAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!audioRef.current || !audioDuration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    audioRef.current.currentTime = percentage * audioDuration
  }

  // Video event listeners
  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setVideoCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setVideoDuration(video.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      video.currentTime = 0
      setVideoCurrentTime(0)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Audio event listeners
  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setAudioCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setAudioDuration(audio.duration)
    const handlePlay = () => setIsAudioPlaying(true)
    const handlePause = () => setIsAudioPlaying(false)
    const handleEnded = () => {
      setIsAudioPlaying(false)
      setAudioCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  return (
    <div
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-lg bg-muted',
          'ring-1 ring-white/10',
          'transition-all duration-200',
          'group-hover:ring-2 group-hover:ring-primary/50',
          'group-hover:shadow-lg'
        )}
      >
        {/* Thumbnail/Image - 이미지 타입만 */}
        {!isVideo && hasThumbnail && (
          <Image
            src={thumbnailUrl!}
            alt={asset.prompt}
            width={asset.width || 400}
            height={asset.height || 300}
            className="w-full h-auto object-cover"
            unoptimized
          />
        )}

        {/* Video player - 단일 비디오 요소 사용 */}
        {isVideo && asset.output_url && (
          <video
            ref={videoRef}
            src={asset.output_url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-auto object-cover"
          />
        )}

        {/* Placeholder for video without output_url */}
        {isVideo && !asset.output_url && (
          <div className="aspect-video w-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
            <Film className="h-12 w-12 text-white/60" />
          </div>
        )}

        {/* Audio mini player */}
        {isAudio && (
          <div className="aspect-video w-full flex flex-col items-center justify-center bg-gradient-to-br from-cyan-900/50 to-blue-900/50 relative">
            {/* Hidden audio element */}
            {asset.output_url && (
              <audio ref={audioRef} src={asset.output_url} preload="metadata" />
            )}

            {/* Music icon background */}
            <Music className="h-12 w-12 text-white/30 absolute" />

            {/* Play/Pause button */}
            <button
              onClick={handleAudioPlayPause}
              className={cn(
                'rounded-full p-4 transition-all z-10',
                isAudioPlaying
                  ? 'bg-white/20 hover:bg-white/30'
                  : 'bg-black/40 hover:bg-black/60'
              )}
            >
              {isAudioPlaying ? (
                <Pause className="h-8 w-8 text-white fill-white" />
              ) : (
                <Play className="h-8 w-8 text-white fill-white" />
              )}
            </button>

            {/* Progress bar and time */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              {/* Progress bar */}
              <div
                className="w-full h-1 bg-white/20 rounded-full cursor-pointer mb-2"
                onClick={handleAudioSeek}
              >
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{
                    width: audioDuration
                      ? `${(audioCurrentTime / audioDuration) * 100}%`
                      : '0%',
                  }}
                />
              </div>

              {/* Time display */}
              <div className="flex justify-between text-xs text-white/80">
                <span>{formatDuration(audioCurrentTime)}</span>
                <span>{formatDuration(audioDuration || asset.duration_seconds || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for image without valid URL */}
        {isImage && !hasThumbnail && (
          <div className="aspect-video w-full flex items-center justify-center bg-gradient-to-br from-green-900/50 to-emerald-900/50">
            <ImageIcon className="h-12 w-12 text-white/60" />
          </div>
        )}

        {/* Fallback placeholder for unknown types or missing thumbnails */}
        {!hasThumbnail && !isVideo && !isAudio && !isImage && (
          <div className="aspect-video w-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <ImageIcon className="h-12 w-12 text-white/40" />
          </div>
        )}

        {/* Video controls overlay */}
        {isVideo && asset.output_url && (
          <div className="absolute inset-0">
            {/* Top: Action buttons */}
            <div className={cn(
              'absolute top-2 right-2 flex gap-1 z-20 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}>
              <button
                onClick={handleDownload}
                className="rounded-full bg-black/50 p-2 text-white hover:bg-[var(--color-neon-pink)] transition-colors"
                title="다운로드"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={handleFavoriteClick}
                className={cn(
                  'rounded-full p-2 transition-colors',
                  asset.is_favorite
                    ? 'bg-red-500 text-white'
                    : 'bg-black/50 text-white hover:bg-black/70'
                )}
                title="좋아요"
              >
                <Heart className={cn('h-4 w-4', asset.is_favorite && 'fill-current')} />
              </button>
              <button
                onClick={handleDeleteClick}
                className="rounded-full bg-black/50 p-2 text-white hover:bg-red-500 transition-colors"
                title="삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Center: Play/Pause button (fixed position) */}
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={handleVideoPlayPause}
            >
              <div
                className={cn(
                  'rounded-full bg-black/60 p-3 transition-all',
                  isPlaying && isHovered ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
                )}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 text-white fill-white" />
                ) : (
                  <Play className="h-6 w-6 text-white fill-white" />
                )}
              </div>
            </div>

            {/* Bottom: Progress bar (shown on hover) */}
            {isHovered && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <div
                  className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-2"
                  onClick={handleVideoSeek}
                >
                  <div
                    className="h-full bg-white rounded-full"
                    style={{
                      width: videoDuration ? `${(videoCurrentTime / videoDuration) * 100}%` : '0%',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/90">
                  <span>{formatDuration(videoCurrentTime)}</span>
                  <span>{formatDuration(videoDuration || asset.duration_seconds || 0)}</span>
                </div>
              </div>
            )}

            {/* Duration badge when not hovered */}
            {!isHovered && asset.duration_seconds && (
              <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                {formatDuration(asset.duration_seconds)}
              </div>
            )}
          </div>
        )}

        {/* Non-video hover overlay with actions */}
        {!isVideo && (
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
            )}
          >
            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={handleDownload}
                className="rounded-full bg-black/50 p-2 text-white hover:bg-[var(--color-neon-pink)] transition-colors"
                title="다운로드"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={handleFavoriteClick}
                className={cn(
                  'rounded-full p-2 transition-colors',
                  asset.is_favorite
                    ? 'bg-red-500 text-white'
                    : 'bg-black/50 text-white hover:bg-black/70'
                )}
                title="좋아요"
              >
                <Heart
                  className={cn('h-4 w-4', asset.is_favorite && 'fill-current')}
                />
              </button>
              <button
                onClick={handleDeleteClick}
                className="rounded-full bg-black/50 p-2 text-white hover:bg-red-500 transition-colors"
                title="삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Prompt text at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-xs text-white line-clamp-2">{asset.prompt}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
