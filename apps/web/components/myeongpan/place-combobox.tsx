'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useMyeongpanStore } from '@/lib/stores/myeongpan-store'
import { searchCities, getCityById, type CityEntry } from '@/lib/constants/city-data'

export function PlaceCombobox() {
  const { placeId, placeName, setPlace } = useMyeongpanStore()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<CityEntry[]>([])
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setResults(searchCities(query).slice(0, 30))
    setHighlightIndex(0)
  }, [query])

  // 외부 클릭 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectCity = useCallback(
    (city: CityEntry) => {
      setPlace(city)
      setQuery('')
      setIsOpen(false)
    },
    [setPlace]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        setHighlightIndex((i) => Math.min(i + 1, results.length - 1))
        e.preventDefault()
        break
      case 'ArrowUp':
        setHighlightIndex((i) => Math.max(i - 1, 0))
        e.preventDefault()
        break
      case 'Enter':
        if (results[highlightIndex]) selectCity(results[highlightIndex])
        e.preventDefault()
        break
      case 'Escape':
        setIsOpen(false)
        e.preventDefault()
        break
    }
  }

  const selectedCity = getCityById(placeId)

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-xs text-white/50">출생지</label>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? query : (selectedCity?.name ?? placeName)}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!isOpen) setIsOpen(true)
        }}
        onFocus={() => {
          setIsOpen(true)
          setQuery('')
        }}
        onKeyDown={handleKeyDown}
        placeholder="도시명 검색 (예: 서울, Tokyo)"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
      />
      {selectedCity && !isOpen && (
        <span className="mt-1 block text-xs text-white/40">
          {selectedCity.country} &middot; {selectedCity.timezone}
        </span>
      )}
      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-white/10 bg-[#1a1a1a] py-1 shadow-xl"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-white/40">검색 결과가 없습니다</li>
          ) : (
            results.map((city, i) => (
              <li
                key={city.id}
                role="option"
                aria-selected={i === highlightIndex}
                onClick={() => selectCity(city)}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  i === highlightIndex ? 'bg-white/10 text-white' : 'text-white/70'
                }`}
              >
                <span className="font-medium">{city.name}</span>
                <span className="ml-2 text-white/40">
                  {city.nameEn} &middot; {city.country}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
