'use client'

import { useMyeongpanStore } from '@/lib/stores/myeongpan-store'
import { LLM_MODELS, ALLOWED_LLM_MODELS } from '@/lib/constants/model-options'
import type { InterpretationTopic } from '@vibe-media-lab/myeongpan-core'

type LlmModelId = (typeof ALLOWED_LLM_MODELS)[number]

const LLM_OPTIONS = LLM_MODELS.options

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
  const { tone, length, topics, llmModel, setTone, setLength, setTopics, setLlmModel } = useMyeongpanStore()

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
        <label className="mb-2 block text-xs text-white/50">분석 모델</label>
        <div className="flex gap-2">
          {LLM_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLlmModel(opt.id as LlmModelId)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                llmModel === opt.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {opt.label}
              {opt.meta?.badge && (
                <span className="ml-1 text-[10px] text-[var(--color-neon-lime)]">{opt.meta.badge}</span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-white/30">
          {LLM_OPTIONS.find((o) => o.id === llmModel)?.description}
        </p>
      </div>

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
