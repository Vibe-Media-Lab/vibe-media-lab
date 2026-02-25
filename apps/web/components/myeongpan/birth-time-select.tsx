'use client'

import { useMyeongpanStore } from '@/lib/stores/myeongpan-store'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

export function BirthTimeSelect() {
  const { birthHour, birthMinute, unknownTime, setBirthHour, setBirthMinute, setUnknownTime } =
    useMyeongpanStore()

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-white/50">시</label>
            <select
              value={birthHour}
              onChange={(e) => setBirthHour(Number(e.target.value))}
              disabled={unknownTime}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-30"
            >
              {HOURS.map((h) => (
                <option key={h} value={h} className="bg-[#1a1a1a]">
                  {String(h).padStart(2, '0')}시
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">분</label>
            <select
              value={birthMinute}
              onChange={(e) => setBirthMinute(Number(e.target.value))}
              disabled={unknownTime}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-30"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m} className="bg-[#1a1a1a]">
                  {String(m).padStart(2, '0')}분
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={unknownTime}
          onChange={(e) => setUnknownTime(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[var(--color-neon-lime)]"
        />
        출생 시간을 모릅니다
      </label>
      {unknownTime && (
        <p className="text-xs text-white/40">
          시간 미상 시 사주만 분석됩니다 (자미두수/서양점성 불가).
        </p>
      )}
    </div>
  )
}
