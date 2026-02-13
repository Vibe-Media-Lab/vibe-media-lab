'use client'

import { useEffect } from 'react'
import { VideoResult } from '@/components/video-generate/video-result'
import { VideoSidebar } from '@/components/video-generate/video-sidebar'
import { MobileCreateSheet } from '@/components/video-generate/mobile-create-sheet'
import { useVideoGenerateStore } from '@/lib/stores/video-generate-store'

export default function VideoPage() {
  // Cleanup blob URLs on page unmount
  useEffect(() => {
    return () => {
      useVideoGenerateStore.getState().clearImage()
    }
  }, [])

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Desktop: sidebar (lg+ only) */}
      <div className="hidden lg:block">
        <VideoSidebar />
      </div>

      {/* Main content: result grid */}
      <div className="flex-1 px-4 py-6 sm:px-6 lg:pl-[344px] lg:pr-8 xl:pr-12">
        <VideoResult />
      </div>

      {/* Mobile: FAB + sheet (below lg) */}
      <MobileCreateSheet className="lg:hidden" />
    </div>
  )
}
