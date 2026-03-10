'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white">
            문제가 발생했습니다
          </h2>
          <p className="mt-2 text-sm text-white/60">
            일시적인 오류가 발생했습니다. 다시 시도해주세요.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-white/30">
              오류 코드: {error.digest}
            </p>
          )}
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-gradient-to-r from-[#ff4ecb] to-[#a855f7] px-6 py-2.5 text-sm font-medium text-white transition-all hover:scale-105 hover:shadow-lg"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
