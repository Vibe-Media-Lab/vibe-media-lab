'use client'

import { Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GiftsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-8 py-8">
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-neon-cyan)]/20">
            <Gift className="h-5 w-5 text-[var(--color-neon-cyan)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Gift Credits</h2>
            <p className="text-sm text-white/60">
              Send credits to friends or team members
            </p>
          </div>
        </div>

        <Button className="bg-[var(--color-neon-pink)] text-white hover:bg-[var(--color-neon-pink)]/90">
          Send a Gift
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Received Gifts</h3>
        <p className="text-sm text-white/60">
          You haven&apos;t received any gifts yet.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Sent Gifts</h3>
        <p className="text-sm text-white/60">
          You haven&apos;t sent any gifts yet.
        </p>
      </div>
    </div>
  )
}
