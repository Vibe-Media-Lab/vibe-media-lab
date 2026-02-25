'use client'

import { useState } from 'react'
import { useMyeongpanStore } from '@/lib/stores/myeongpan-store'
import { BirthDateSelect } from './birth-date-select'
import { BirthTimeSelect } from './birth-time-select'
import { PlaceCombobox } from './place-combobox'
import { InterpretationOptions } from './interpretation-options'

const HOUSE_SYSTEMS = [
  { value: 'placidus' as const, label: 'Placidus' },
  { value: 'koch' as const, label: 'Koch' },
  { value: 'equal' as const, label: 'Equal' },
  { value: 'whole-sign' as const, label: 'Whole Sign' },
]

export function BirthForm() {
  const {
    gender,
    calendarMode,
    isLeapMonth,
    houseSystem,
    phase,
    setGender,
    setCalendarMode,
    setIsLeapMonth,
    setHouseSystem,
    submit,
  } = useMyeongpanStore()

  const [showAdvanced, setShowAdvanced] = useState(false)
  const isSubmitting = phase === 'loading'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 생년월일 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-sm font-medium text-white/80">생년월일</h3>
        <BirthDateSelect />
      </div>

      {/* 출생시간 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-sm font-medium text-white/80">출생 시간</h3>
        <BirthTimeSelect />
      </div>

      {/* 성별 + 양/음력 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-xs text-white/50">성별</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                  gender === 'male'
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                남성
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                  gender === 'female'
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                여성
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs text-white/50">달력</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCalendarMode('solar')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                  calendarMode === 'solar'
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                양력
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('lunar')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                  calendarMode === 'lunar'
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                음력
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 출생지 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-sm font-medium text-white/80">출생지</h3>
        <PlaceCombobox />
      </div>

      {/* 풀이 옵션 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-sm font-medium text-white/80">풀이 옵션</h3>
        <InterpretationOptions />
      </div>

      {/* 고급 설정 */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-white/40 hover:text-white/60"
        >
          {showAdvanced ? '고급 설정 접기' : '고급 설정 펼치기'}
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            {calendarMode === 'lunar' && (
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={isLeapMonth}
                  onChange={(e) => setIsLeapMonth(e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--color-neon-lime)]"
                />
                윤달
              </label>
            )}
            <div>
              <label className="mb-2 block text-xs text-white/50">하우스 시스템 (서양점성)</label>
              <div className="flex flex-wrap gap-2">
                {HOUSE_SYSTEMS.map((hs) => (
                  <button
                    key={hs.value}
                    type="button"
                    onClick={() => setHouseSystem(hs.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      houseSystem === hs.value
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    {hs.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 제출 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-[var(--color-neon-lime)] px-6 py-3 text-base font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? '분석 중...' : '명판 보기'}
      </button>
    </form>
  )
}
