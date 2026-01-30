'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Play, Eye } from 'lucide-react'

interface TrendingItem {
  id: string
  title: string
  creator: string
  views: string
  thumbnail: string
  template: string
}

const TRENDING_ITEMS: TrendingItem[] = [
  {
    id: '1',
    title: '충격적인 AI 사실 10가지',
    creator: '@techbro_kr',
    views: '1.2M',
    thumbnail: '/trending/1.jpg',
    template: 'Fact Bomb',
  },
  {
    id: '2',
    title: '이 제품 실화냐',
    creator: '@unbox_queen',
    views: '890K',
    thumbnail: '/trending/2.jpg',
    template: 'Oddly Satisfying',
  },
  {
    id: '3',
    title: '뉴진스 AI 커버',
    creator: '@ai_music_lab',
    views: '2.1M',
    thumbnail: '/trending/3.jpg',
    template: 'AI Cover MV',
  },
  {
    id: '4',
    title: '회사 퇴사 스토리',
    creator: '@office_tales',
    views: '650K',
    thumbnail: '/trending/4.jpg',
    template: 'POV: Storytime',
  },
  {
    id: '5',
    title: '롤 하이라이트 모음',
    creator: '@lol_moments',
    views: '430K',
    thumbnail: '/trending/5.jpg',
    template: 'Gameplay Clips',
  },
  {
    id: '6',
    title: '브레인롯 밈 모음',
    creator: '@meme_factory',
    views: '3.4M',
    thumbnail: '/trending/6.jpg',
    template: 'Brainrot Core',
  },
]

export function TrendingSection() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          Trending Now
        </h2>
        <a
          href="/explore"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          See all →
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {TRENDING_ITEMS.map((item) => (
          <TrendingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

function TrendingCard({ item }: { item: TrendingItem }) {
  return (
    <a
      href={`/watch/${item.id}`}
      className={cn(
        'group block rounded-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-pink)] focus-visible:ring-offset-2 focus-visible:ring-offset-black'
      )}
    >
      <article>
        <div
          className={cn(
            'relative aspect-[9/16] overflow-hidden rounded-xl',
            'bg-gradient-to-br from-white/10 to-white/5',
            'ring-1 ring-white/10',
            'transition-[ring] duration-300',
            'group-hover:ring-white/30'
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center opacity-0',
              'transition-opacity duration-300',
              'group-hover:opacity-100'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Play className="h-4 w-4 fill-white text-white" aria-hidden="true" />
            </div>
          </div>

          <div className="absolute left-2 top-2">
            <span className="rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
              {item.template}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-2">
            <p className="line-clamp-2 text-xs font-medium text-white">
              {item.title}
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-white/60">{item.creator}</span>
              <span className="flex items-center gap-0.5 text-[10px] text-white/60">
                <Eye className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">조회수</span>
                {item.views}
              </span>
            </div>
          </div>
        </div>
      </article>
    </a>
  )
}
