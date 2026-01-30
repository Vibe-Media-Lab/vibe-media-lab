'use client'

import { cn } from '@/lib/utils'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { GenerationProgress } from './types'

interface ProgressDisplayProps {
  progress: GenerationProgress
  showPerItem?: boolean
}

export function ProgressDisplay({ progress, showPerItem }: ProgressDisplayProps) {
  const percentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/80">{progress.message}</span>
          <span className="text-white/60">
            {progress.current}/{progress.total}
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>

      {/* Per-item Progress */}
      {showPerItem && progress.items && progress.items.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {progress.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col items-center gap-1 text-center"
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                  item.status === 'completed' &&
                    'bg-[var(--color-neon-lime)]/20 text-[var(--color-neon-lime)]',
                  item.status === 'processing' &&
                    'animate-pulse bg-[var(--color-neon-pink)]/20 text-[var(--color-neon-pink)]',
                  item.status === 'pending' && 'bg-white/10 text-white/40',
                  item.status === 'failed' && 'bg-red-500/20 text-red-500'
                )}
              >
                {item.status === 'completed' ? (
                  <Check className="h-4 w-4" />
                ) : item.status === 'processing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : item.status === 'failed' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  item.label.slice(0, 2)
                )}
              </div>
              <span className="text-[10px] text-white/60">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Estimated Time */}
      {progress.estimatedEndAt && (
        <p className="text-center text-xs text-white/40">
          예상 완료:{' '}
          {new Date(progress.estimatedEndAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  )
}
