'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Template, TemplateBadge } from '@vibe-media-lab/shared'

interface TemplateHeroProps {
  template: Template
}

const BADGE_STYLES: Record<TemplateBadge, string> = {
  HOT: 'bg-[var(--color-neon-pink)] text-white',
  NEW: 'bg-[var(--color-neon-cyan)] text-black',
  TRENDING: 'bg-[var(--color-neon-lime)] text-black',
}

export function TemplateHero({ template }: TemplateHeroProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = React.useState(true)
  const [isMuted, setIsMuted] = React.useState(true)
  const [isLoaded, setIsLoaded] = React.useState(false)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  React.useEffect(() => {
    if (videoRef.current && isLoaded) {
      videoRef.current.play()
    }
  }, [isLoaded])

  return (
    <div className="relative aspect-[9/16] max-h-[70vh] w-full overflow-hidden rounded-3xl bg-white/10 md:aspect-video md:max-h-none">
      <video
        ref={videoRef}
        src={template.video}
        poster={template.poster}
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setIsLoaded(true)}
        className={cn(
          'h-full w-full object-cover',
          'transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />

      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 to-white/5" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {template.badge && (
        <span
          className={cn(
            'absolute left-4 top-4 z-10 rounded-full px-3 py-1.5',
            'text-xs font-bold uppercase tracking-wider',
            BADGE_STYLES[template.badge]
          )}
        >
          {template.badge}
        </span>
      )}

      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full border-white/30 bg-black/50 backdrop-blur-sm hover:bg-black/70"
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={toggleMute}
          className="h-10 w-10 rounded-full border-white/30 bg-black/50 backdrop-blur-sm hover:bg-black/70"
          aria-label={isMuted ? '음소거 해제' : '음소거'}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-white" />
          ) : (
            <Volume2 className="h-4 w-4 text-white" />
          )}
        </Button>
      </div>
    </div>
  )
}
