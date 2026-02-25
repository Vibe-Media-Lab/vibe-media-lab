'use client'

import { toast } from 'sonner'

interface CtaSectionProps {
  chartId: string
}

export function CtaSection({ chartId }: CtaSectionProps) {
  const handleCopyLink = () => {
    const url = `${window.location.origin}/myeongpan?chartId=${chartId}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('링크가 복사되었습니다.'),
      () => toast.error('링크 복사에 실패했습니다.')
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="mb-4 text-sm font-medium text-white/80">이 결과로 콘텐츠 만들기</h3>
      <div className="flex flex-wrap gap-3">
        <a
          href={`/video?source=myeongpan&chartId=${chartId}&format=shorts`}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/15"
        >
          30초 쇼츠
        </a>
        <a
          href={`/video?source=myeongpan&chartId=${chartId}&format=narration`}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/15"
        >
          내레이션 영상
        </a>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <span className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/50">
          &#10003; 저장됨
        </span>
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10"
        >
          링크 복사
        </button>
      </div>
    </div>
  )
}
