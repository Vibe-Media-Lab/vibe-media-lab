'use client'

import { useEffect } from 'react'
import { ImageGrid } from '@/components/image-generate/image-grid'
import { PromptBar } from '@/components/image-generate/prompt-bar'
import { useImageGenerateStore } from '@/lib/stores/image-generate-store'

export default function ImagePage() {
  // Cleanup blob URLs on page unmount
  useEffect(() => {
    return () => {
      useImageGenerateStore.getState().clearReferences()
    }
  }, [])

  return (
    <>
      <ImageGrid />
      <PromptBar />
    </>
  )
}
