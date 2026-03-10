import { describe, it, expect } from 'vitest'
import { buildQuickstartPrompt } from '../quickstart/route'

describe('buildQuickstartPrompt', () => {
  it('preset 아키타입 → preset 필드 모두 포함', () => {
    const result = buildQuickstartPrompt('bright-3d-boy')
    expect(result).toContain('Visual style: bright-3d')
    expect(result).toContain('Pixar 3D animation style')
    expect(result).toContain('#4ECDC4')
    expect(result).toContain('활발하고 호기심 많은')
  })

  it('freetext + freeText → 사용자 설명 포함 (user_input 태그 내부)', () => {
    const result = buildQuickstartPrompt('freetext', '날개 달린 고양이')
    expect(result).toContain('날개 달린 고양이')
    expect(result).toContain('<user_input>')
    expect(result).not.toContain('Visual style:')
  })

  it('freetext + freeText 없음 → fallback', () => {
    const result = buildQuickstartPrompt('freetext')
    expect(result).toContain('freetext')
  })

  it('존재하지 않는 아키타입 → fallback', () => {
    const result = buildQuickstartPrompt('nonexistent')
    expect(result).toContain('nonexistent')
  })

  it('9종 아키타입 모두 promptKeywords 포함', () => {
    const ids = [
      'bright-3d-boy', 'watercolor-fantasy-witch', 'round-mascot-animal',
      'dark-mood-mystery', 'mini-fairy', 'webtoon-hip-teen',
      'watercolor-emotional-girl', 'mecha-sf-ai', 'eastern-traditional-hanbok',
    ]
    for (const id of ids) {
      const result = buildQuickstartPrompt(id)
      expect(result).toContain('Style keywords:')
      expect(result).toContain('Visual style:')
    }
  })
})
