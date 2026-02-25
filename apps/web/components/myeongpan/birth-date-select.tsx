'use client'

import { useMyeongpanStore } from '@/lib/stores/myeongpan-store'

const YEARS = Array.from({ length: 151 }, (_, i) => 1900 + i) // 1900-2050
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function BirthDateSelect() {
  const { birthYear, birthMonth, birthDay, setBirthYear, setBirthMonth, setBirthDay } =
    useMyeongpanStore()

  const maxDay = getDaysInMonth(birthYear, birthMonth)

  const handleYearChange = (v: number) => {
    setBirthYear(v)
    const newMax = getDaysInMonth(v, birthMonth)
    if (birthDay > newMax) setBirthDay(newMax)
  }

  const handleMonthChange = (v: number) => {
    setBirthMonth(v)
    const newMax = getDaysInMonth(birthYear, v)
    if (birthDay > newMax) setBirthDay(newMax)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className="mb-1 block text-xs text-white/50">년</label>
        <select
          value={birthYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          {YEARS.map((y) => (
            <option key={y} value={y} className="bg-[#1a1a1a]">
              {y}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/50">월</label>
        <select
          value={birthMonth}
          onChange={(e) => handleMonthChange(Number(e.target.value))}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m} className="bg-[#1a1a1a]">
              {m}월
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-white/50">일</label>
        <select
          value={birthDay}
          onChange={(e) => setBirthDay(Number(e.target.value))}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d} className="bg-[#1a1a1a]">
              {d}일
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
