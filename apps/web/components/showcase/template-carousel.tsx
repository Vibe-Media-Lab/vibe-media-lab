'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Template {
  id: string
  title: string
  description: string
  views: string
  video: string
  poster: string
  badge?: string
}

function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  const [isDragging, setIsDragging] = React.useState(false)
  const startX = React.useRef(0)
  const scrollLeft = React.useRef(0)

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (!ref.current) return
    setIsDragging(true)
    startX.current = e.pageX - ref.current.offsetLeft
    scrollLeft.current = ref.current.scrollLeft
  }, [ref])

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!isDragging || !ref.current) return
    e.preventDefault()
    const x = e.pageX - ref.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    ref.current.scrollLeft = scrollLeft.current - walk
  }, [isDragging, ref])

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  return {
    isDragging,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
  }
}

const TEMPLATES: Template[] = [
  {
    id: 'kids-animation',
    title: 'Kids Animation Studio',
    description: 'Disney/Pixar 스타일 아동용 애니메이션',
    views: '320K',
    video: '/templates/kids-animation.mp4',
    poster: '/templates/kids-animation.jpg',
    badge: 'NEW',
  },
  {
    id: 'brainrot',
    title: 'Brainrot Core',
    description: '서브웨이 서퍼 + 밈 편집의 정석',
    views: '2.4M',
    video: '/templates/brainrot.mp4',
    poster: '/templates/brainrot.webp',
    badge: 'HOT',
  },
  {
    id: 'storytime',
    title: 'POV: Storytime',
    description: '자막 + 배경영상 + AI 내레이션',
    views: '850K',
    video: '/templates/storytime.mp4',
    poster: '/templates/storytime.webp',
  },
  {
    id: 'satisfying',
    title: 'Oddly Satisfying',
    description: 'ASMR 언박싱 & 만족감 영상',
    views: '1.2M',
    video: '/templates/satisfying.mp4',
    poster: '/templates/satisfying.webp',
    badge: 'TRENDING',
  },
  {
    id: 'gameplay',
    title: 'Gameplay Clips',
    description: '게임 하이라이트 + 밈 효과',
    views: '500K',
    video: '/templates/gameplay.mp4',
    poster: '/templates/gameplay.webp',
  },
  {
    id: 'aicover',
    title: 'AI Cover MV',
    description: 'AI 보이스 커버 + 비주얼라이저',
    views: '780K',
    video: '/templates/aicover.mp4',
    poster: '/templates/aicover.webp',
    badge: 'NEW',
  },
  {
    id: 'factbomb',
    title: 'Fact Bomb',
    description: '팩트폭격 쇼츠 + 다이나믹 텍스트',
    views: '620K',
    video: '/templates/factbomb.mp4',
    poster: '/templates/factbomb.webp',
  },
  {
    id: 'duet',
    title: 'Duet React',
    description: '리액션 듀엣 + 분할 화면',
    views: '430K',
    video: '/templates/duet.mp4',
    poster: '/templates/duet.webp',
  },
  {
    id: 'tutorial',
    title: 'Quick Tutorial',
    description: '30초 튜토리얼 + 스텝 애니메이션',
    views: '920K',
    video: '/templates/tutorial.mp4',
    poster: '/templates/tutorial.webp',
    badge: 'TRENDING',
  },
  {
    id: 'meme',
    title: 'Meme Machine',
    description: '트렌딩 밈 + 자동 편집',
    views: '1.8M',
    video: '/templates/meme.mp4',
    poster: '/templates/meme.webp',
    badge: 'HOT',
  },
  {
    id: 'aesthetic',
    title: 'Aesthetic Vibes',
    description: '감성 브이로그 + 필터 프리셋',
    views: '670K',
    video: '/templates/aesthetic.mp4',
    poster: '/templates/aesthetic.webp',
  },
  {
    id: 'challenge',
    title: 'Dance Challenge',
    description: '댄스 챌린지 + 비트싱크',
    views: '2.1M',
    video: '/templates/challenge.mp4',
    poster: '/templates/challenge.webp',
    badge: 'HOT',
  },
  {
    id: 'compare',
    title: 'Before & After',
    description: '비포애프터 + 트랜지션 효과',
    views: '540K',
    video: '/templates/compare.mp4',
    poster: '/templates/compare.webp',
    badge: 'NEW',
  },
]

export function TemplateCarousel() {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)
  const { isDragging, handlers } = useDragScroll(scrollRef)

  const checkScroll = React.useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }, [])

  React.useEffect(() => {
    checkScroll()
    const ref = scrollRef.current
    ref?.addEventListener('scroll', checkScroll)
    return () => ref?.removeEventListener('scroll', checkScroll)
  }, [checkScroll])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = scrollRef.current.clientWidth * 0.6
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="relative py-8">
      <div className="mb-6 flex items-center justify-between px-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">
            <span className="bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-cyan)] bg-clip-text text-transparent">
              Viral Templates
            </span>
          </h2>
          <p className="mt-1 text-sm text-white/60">
            검증된 바이럴 포맷, 클릭 한 번으로 생성
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="이전 템플릿"
            className="h-8 w-8 rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="다음 템플릿"
            className="h-8 w-8 rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className={cn(
            'flex gap-4 overflow-x-auto px-4 py-2 scrollbar-hide sm:px-6 lg:px-24 xl:px-32 2xl:px-40',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
          {...handlers}
        >
          {TEMPLATES.map((template) => (
            <TemplateCard key={template.id} template={template} isDragging={isDragging} />
          ))}
        </div>

        {/* Left fade gradient */}
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 z-10',
            'w-4 sm:w-6 lg:w-24 xl:w-32 2xl:w-40',
            'bg-gradient-to-r from-[#0a0a0a] to-transparent',
            'transition-opacity duration-300',
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        />

        {/* Right fade gradient */}
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-10',
            'w-16 sm:w-20 lg:w-32 xl:w-40 2xl:w-48',
            'bg-gradient-to-l from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent',
            'transition-opacity duration-300',
            canScrollRight ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        />
      </div>
    </section>
  )
}

function TemplateCard({ template, isDragging }: { template: Template; isDragging?: boolean }) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)
  const [isLoaded, setIsLoaded] = React.useState(false)
  const clickPrevented = React.useRef(false)

  const handleMouseEnter = () => {
    if (isDragging) return
    setIsHovered(true)
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {
        // Ignore AbortError when play is interrupted by pause
      })
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const handleMouseDown = () => {
    clickPrevented.current = false
  }

  const handleMouseMove = () => {
    clickPrevented.current = true
  }

  const handleClick = () => {
    if (clickPrevented.current || isDragging) return
    window.location.href = `/templates/${template.id}/workflow`
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!isDragging) {
        window.location.href = `/templates/${template.id}/workflow`
      }
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      className={cn(
        'group relative flex-shrink-0',
        'w-[200px] sm:w-[240px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-pink)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl',
        isDragging ? 'pointer-events-none' : 'cursor-pointer'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <div
        className={cn(
          'relative aspect-[9/16] overflow-hidden rounded-2xl',
          'bg-gradient-to-br from-white/10 to-white/5',
          'ring-1 ring-white/10',
          'transition-[ring,box-shadow] duration-300',
          'group-hover:ring-2 group-hover:ring-[var(--color-neon-pink)]/50',
          'group-hover:shadow-[0_0_30px_rgba(244,37,140,0.3)]'
        )}
      >
        {/* Poster image - visible until video plays */}
        <img
          src={template.poster}
          alt={template.title}
          width={240}
          height={427}
          className={cn(
            'absolute inset-0 h-full w-full object-cover',
            'transition-opacity duration-300',
            isHovered ? 'opacity-0' : 'opacity-100'
          )}
        />

        <video
          ref={videoRef}
          src={template.video}
          width={240}
          height={427}
          muted
          loop
          playsInline
          preload="none"
          onLoadedData={() => setIsLoaded(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover',
            'transition-opacity duration-300',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {template.badge && (
          <span
            className={cn(
              'absolute left-3 top-3 z-10 rounded-full px-2.5 py-1',
              'text-[10px] font-bold uppercase tracking-wider',
              template.badge === 'HOT' && 'bg-[var(--color-neon-pink)] text-white',
              template.badge === 'NEW' && 'bg-[var(--color-neon-cyan)] text-black',
              template.badge === 'TRENDING' && 'bg-[var(--color-neon-lime)] text-black'
            )}
          >
            {template.badge}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 p-4">
          <h3 className="font-semibold text-white">{template.title}</h3>
          <p className="mt-1 text-xs text-white/70">{template.description}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-white/50">
            <span>{template.views} views</span>
          </div>
        </div>
      </div>
    </article>
  )
}
