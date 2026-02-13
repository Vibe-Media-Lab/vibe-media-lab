'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { ModelBanner } from './model-banner'
import { SidebarForm } from './sidebar-form'
import { cn } from '@/lib/utils'

interface MobileCreateSheetProps {
  className?: string
}

export function MobileCreateSheet({ className }: MobileCreateSheetProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={className}>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-neon-lime)] text-black shadow-2xl transition-transform hover:brightness-110 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            'top-0 left-0 max-w-none translate-x-0 translate-y-0',
            'flex flex-col h-dvh w-screen',
            'rounded-none border-0 gap-0 p-0',
            'bg-[#0f0f19]',
            'data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100',
          )}
        >
          {/* Accessible hidden title */}
          <DialogTitle className="sr-only">비디오 생성</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Create Video</h2>
            <DialogClose asChild>
              <button className="rounded-full p-2 hover:bg-white/5">
                <X className="h-5 w-5 text-white/60" />
              </button>
            </DialogClose>
          </div>

          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto p-5">
            <ModelBanner />
            <div className="mt-4">
              <SidebarForm onGenerateSuccess={() => setOpen(false)} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
