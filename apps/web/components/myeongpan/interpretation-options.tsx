'use client'

import { useMyeongpanStore } from '@/lib/stores/myeongpan-store'
import type { InterpretationTopic } from '@vibe-media-lab/myeongpan-core'

const TONE_OPTIONS = [
  { value: 'warm' as const, label: '따뜻한' },
  { value: 'neutral' as const, label: '중립적' },
  { value: 'professional' as const, label: '전문적' },
]

const LENGTH_OPTIONS = [
  { value: 'short' as const, label: '간결' },
  { value: 'medium' as const, label: '보통' },
  { value: 'long' as const, label: '상세' },
]

const TOPIC_OPTIONS: { value: InterpretationTopic; label: string }[] = [
  { value: 'personality', label: '성격' },
  { value: 'career', label: '직업/진로' },
  { value: 'relationships', label: '인간관계' },
  { value: 'health', label: '건강' },
  { value: 'wealth', label: '재물' },
  { value: 'timing', label: '운세/시기' },
]

export function InterpretationOptions() {
  const { tone, length, topics, setTone, setLength, setTopics } = useMyeongpanStore()

  const toggleTopic = (topic: InterpretationTopic) => {
    if (topics.includes(topic)) {
      setTopics(topics.filter((t) => t !== topic))
    } else {
      setTopics([...topics, topic])
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-xs text-white/50">풀이 어조</label>
        <div className="flex gap-2">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTone(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                tone === opt.value
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs text-white/50">풀이 길이</label>
        <div className="flex gap-2">
          {LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLength(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                length === opt.value
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs text-white/50">
          주제 선택 <span className="text-white/30">(비워두면 전체 분석)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TOPIC_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleTopic(opt.value)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                topics.includes(opt.value)
                  ? 'bg-[var(--color-neon-lime)] text-black'
                  : 'bg-white/5 text-white/50 hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
