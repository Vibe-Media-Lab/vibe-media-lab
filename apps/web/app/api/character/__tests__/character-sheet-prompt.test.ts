import { describe, it, expect } from 'vitest'
import {
  buildStyledSheetPrompt,
} from '@/lib/prompts/character-prompt-builder'

describe('character-sheet 프롬프트 와이어링', () => {
  it('styleHint 전달 시 스타일 prefix + avoid 포함', () => {
    const result = buildStyledSheetPrompt(
      { prompt: 'Front view, facing camera directly, neutral expression' },
      'A cheerful boy with round face',
      { visualStyle: 'bright-3d', promptKeywords: [] },
    )
    expect(result).toContain('Pixar-quality 3D')
    expect(result).toContain('Front view, facing camera directly')
    expect(result).toContain('A cheerful boy with round face')
    expect(result).toContain('Avoid:')
  })

  it('styleHint 없으면 제네릭 폴백', () => {
    const result = buildStyledSheetPrompt(
      { prompt: 'Action pose, dynamic movement' },
      'A warrior',
    )
    expect(result).toContain('Action pose, dynamic movement')
    expect(result).toContain('A warrior')
    expect(result).toContain('cut-off body parts')
  })

  it('다크 무드 스타일에 맞는 avoid 지시', () => {
    const result = buildStyledSheetPrompt(
      { prompt: 'Three-quarter view' },
      'A mysterious figure in dark cloak',
      { visualStyle: 'dark-mood', promptKeywords: [] },
    )
    expect(result).toContain('Dramatic dark-mood')
    expect(result).toContain('bright pastel')
  })

  it('각 variation에 캐릭터 일관성 지시 포함', () => {
    const variations = [
      { prompt: 'Front view, facing camera directly' },
      { prompt: 'Three-quarter view, slightly turned' },
      { prompt: 'Happy expression, bright smile' },
      { prompt: 'Action pose, dynamic movement' },
    ]

    for (const variation of variations) {
      const result = buildStyledSheetPrompt(variation, 'A test char')
      expect(result).toContain('Keep the same character design')
    }
  })
})
