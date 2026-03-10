'use client'

import { useMemo, useState } from 'react'
import { marked } from 'marked'
import DOMPurify, { type Config } from 'dompurify'
import type { InterpretationResult } from '@vibe-media-lab/myeongpan-core'

const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'h4', 'h5', 'blockquote'],
  ALLOWED_ATTR: [],
}

const TOPIC_LABELS: Record<string, string> = {
  personality: '성격/성향',
  career: '직업/진로',
  relationships: '인간관계',
  health: '건강',
  wealth: '재물',
  timing: '운세/시기',
}

export function TabInterpretation({
  interpretation,
}: {
  interpretation: InterpretationResult | null
}) {
  const [openSection, setOpenSection] = useState<number | null>(0)

  if (!interpretation) {
    return (
      <div className="py-12 text-center text-sm text-white/40">
        풀이가 아직 생성되지 않았습니다. &quot;다시 풀이&quot; 버튼을 눌러주세요.
      </div>
    )
  }

  const toggle = (i: number) => {
    setOpenSection(openSection === i ? null : i)
  }

  return (
    <div className="space-y-4">
      {/* 섹션 아코디언 */}
      {interpretation.sections.map((section, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={() => toggle(i)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/50">
                {TOPIC_LABELS[section.topic] ?? section.topic}
              </span>
              <span className="text-sm font-medium text-white">{section.title}</span>
            </div>
            <span className="text-white/30">{openSection === i ? '\u25B2' : '\u25BC'}</span>
          </button>
          {openSection === i && (
            <div className="border-t border-white/5 px-4 py-4">
              <SanitizedMarkdown body={section.body} />
              {section.crossReferences.length > 0 && (
                <div className="mt-3 border-t border-white/5 pt-3">
                  <h5 className="mb-1 text-[10px] text-white/40">교차 분석</h5>
                  <ul className="space-y-1">
                    {section.crossReferences.map((ref, ri) => (
                      <li key={ri} className="text-xs text-white/50">
                        &bull; {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* 교차 체계 분석 */}
      {interpretation.crossSystemAnalysis && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h4 className="mb-3 text-sm font-medium text-white">체계 간 종합 분석</h4>

          {interpretation.crossSystemAnalysis.consensus.length > 0 && (
            <div className="mb-3">
              <h5 className="mb-1 text-xs text-[var(--color-neon-lime)]/70">공통점</h5>
              <ul className="space-y-1">
                {interpretation.crossSystemAnalysis.consensus.map((c, i) => (
                  <li key={i} className="text-xs text-white/60">
                    <SanitizedMarkdown body={c} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {interpretation.crossSystemAnalysis.contrasts.length > 0 && (
            <div className="mb-3">
              <h5 className="mb-1 text-xs text-orange-400/70">차이점</h5>
              <ul className="space-y-1">
                {interpretation.crossSystemAnalysis.contrasts.map((c, i) => (
                  <li key={i} className="text-xs text-white/60">
                    <SanitizedMarkdown body={c} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {interpretation.crossSystemAnalysis.synthesis && (
            <div>
              <h5 className="mb-1 text-xs text-white/40">종합</h5>
              <SanitizedMarkdown body={interpretation.crossSystemAnalysis.synthesis} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SanitizedMarkdown({ body }: { body: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(body, { async: false }) as string
    return DOMPurify.sanitize(raw, PURIFY_CONFIG)
  }, [body])

  return (
    <div
      className="prose prose-invert prose-sm max-w-none text-white/80"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
