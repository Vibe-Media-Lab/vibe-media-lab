'use client'

import { Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function PromocodePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-8 py-8">
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-neon-purple)]/20">
            <Tag className="h-5 w-5 text-[var(--color-neon-purple)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Promocode</h2>
            <p className="text-sm text-white/60">
              Enter a promocode to get credits or unlock features
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Input
            placeholder="Enter promocode"
            className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-white/40"
          />
          <Button className="bg-[var(--color-neon-pink)] text-white hover:bg-[var(--color-neon-pink)]/90">
            Apply
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">History</h3>
        <p className="text-sm text-white/60">
          No promocodes have been applied yet.
        </p>
      </div>
    </div>
  )
}
