import { describe, it, expect } from 'vitest'
import {
  buildStyledPortraitPrompt,
  buildStyledSheetPrompt,
  buildStyledVariationSuffix,
} from '../character-prompt-builder'
import type { StyleHint } from '@/lib/api/character/types'

const STYLES: Array<{ visualStyle: string; expectPrefix: string; expectAvoid: string }> = [
  { visualStyle: 'bright-3d', expectPrefix: 'Pixar-quality 3D', expectAvoid: '2D flat art' },
  { visualStyle: 'watercolor-fantasy', expectPrefix: 'Ethereal watercolor fantasy', expectAvoid: 'hard digital edges' },
  { visualStyle: 'round-mascot', expectPrefix: 'Adorable kawaii mascot', expectAvoid: 'realistic anatomy' },
  { visualStyle: 'dark-mood', expectPrefix: 'Dramatic dark-mood', expectAvoid: 'bright pastel' },
  { visualStyle: 'mini-chibi', expectPrefix: 'Super-deformed chibi', expectAvoid: 'realistic proportions' },
  { visualStyle: 'webtoon-modern', expectPrefix: 'Modern Korean webtoon', expectAvoid: '3D rendering' },
  { visualStyle: 'watercolor-emotional', expectPrefix: 'Emotional watercolor anime', expectAvoid: 'hard digital edges' },
  { visualStyle: 'mecha-sf', expectPrefix: 'Futuristic sci-fi', expectAvoid: 'fantasy medieval' },
  { visualStyle: 'eastern-traditional', expectPrefix: 'Traditional East Asian', expectAvoid: 'modern clothing' },
]

describe('buildStyledPortraitPrompt', () => {
  it.each(STYLES)('$visualStyle: includes stylePrefix, styleSuffix, and avoidClause', ({ visualStyle, expectPrefix, expectAvoid }) => {
    const hint: StyleHint = { visualStyle, promptKeywords: ['TestKeyword'] }
    const result = buildStyledPortraitPrompt('A cool character with blue hair', hint)

    expect(result).toContain(expectPrefix)
    expect(result).toContain('Avoid:')
    expect(result).toContain(expectAvoid)
    expect(result).toContain('A cool character with blue hair')
  })

  it('styleHint 없을 때 제네릭 폴백 + avoid 포함', () => {
    const result = buildStyledPortraitPrompt('A warrior with armor')
    expect(result).toContain('Full-body character illustration:')
    expect(result).toContain('A warrior with armor')
    expect(result).toContain('Avoid:')
    expect(result).toContain('cut-off body parts')
  })

  it('미지원 visualStyle → 제네릭 폴백', () => {
    const hint: StyleHint = { visualStyle: 'unknown-style', promptKeywords: [] }
    const result = buildStyledPortraitPrompt('A wizard', hint)
    expect(result).toContain('Full-body character illustration:')
    expect(result).toContain('Avoid:')
  })

  it('promptKeywords 중 visualDescription에 없는 것만 주입', () => {
    const hint: StyleHint = {
      visualStyle: 'bright-3d',
      promptKeywords: ['Pixar 3D animation style', 'soft lighting', 'unique-keyword-xyz'],
    }
    const result = buildStyledPortraitPrompt('A boy with soft lighting and round face', hint)

    // 'soft lighting'은 이미 description에 있으므로 Style references에 포함되지 않아야 함
    // 'unique-keyword-xyz'는 없으므로 포함되어야 함
    expect(result).toContain('unique-keyword-xyz')
    expect(result).toContain('Pixar 3D animation style')
  })

  it('모든 promptKeywords가 이미 포함되어 있으면 Style references 절 생략', () => {
    const hint: StyleHint = {
      visualStyle: 'bright-3d',
      promptKeywords: ['bright colors'],
    }
    const result = buildStyledPortraitPrompt('A boy with bright colors and a hat', hint)
    expect(result).not.toContain('Style references:')
  })
})

describe('buildStyledSheetPrompt', () => {
  it('variation.prompt + 스타일 강화 포함', () => {
    const hint: StyleHint = { visualStyle: 'bright-3d', promptKeywords: [] }
    const result = buildStyledSheetPrompt(
      { prompt: 'Front view, facing camera directly' },
      'A boy with blue eyes',
      hint,
    )

    expect(result).toContain('Pixar-quality 3D')
    expect(result).toContain('Front view, facing camera directly')
    expect(result).toContain('A boy with blue eyes')
    expect(result).toContain('Avoid:')
  })

  it('styleHint 없을 때 기본 avoid 포함', () => {
    const result = buildStyledSheetPrompt(
      { prompt: 'Happy expression, bright smile' },
      'A warrior',
    )

    expect(result).toContain('Happy expression, bright smile')
    expect(result).toContain('A warrior')
    expect(result).toContain('Avoid:')
    expect(result).toContain('cut-off body parts')
  })

  it('미지원 visualStyle → 제네릭 폴백', () => {
    const hint: StyleHint = { visualStyle: 'nonexistent', promptKeywords: [] }
    const result = buildStyledSheetPrompt(
      { prompt: 'Action pose' },
      'A dancer',
      hint,
    )

    expect(result).toContain('Avoid:')
    expect(result).toContain('cut-off body parts')
  })
})

describe('buildStyledVariationSuffix', () => {
  it.each(STYLES.map((s) => s.visualStyle))('%s: 스타일 인지 suffix 반환 (index 1-3)', (visualStyle) => {
    const hint: StyleHint = { visualStyle, promptKeywords: [] }

    const s1 = buildStyledVariationSuffix(1, hint)
    const s2 = buildStyledVariationSuffix(2, hint)
    const s3 = buildStyledVariationSuffix(3, hint)

    // 각 suffix는 비어있지 않아야 함
    expect(s1.length).toBeGreaterThan(5)
    expect(s2.length).toBeGreaterThan(5)
    expect(s3.length).toBeGreaterThan(5)

    // 각 suffix는 서로 다름
    expect(s1).not.toBe(s2)
    expect(s2).not.toBe(s3)
  })

  it('styleHint 없을 때 generic suffix 폴백', () => {
    const s1 = buildStyledVariationSuffix(1)
    const s2 = buildStyledVariationSuffix(2)
    const s3 = buildStyledVariationSuffix(3)

    expect(s1).toContain('warmer color palette')
    expect(s2).toContain('cooler tones')
    expect(s3).toContain('minimalist design')
  })

  it('미지원 visualStyle → generic suffix 폴백', () => {
    const hint: StyleHint = { visualStyle: 'nonexistent', promptKeywords: [] }
    const result = buildStyledVariationSuffix(1, hint)
    expect(result).toContain('warmer color palette')
  })

  it('index 0 → 첫번째 variation', () => {
    const hint: StyleHint = { visualStyle: 'bright-3d', promptKeywords: [] }
    const result = buildStyledVariationSuffix(0, hint)
    // index 0은 clamp되어 첫번째 variation과 동일
    expect(result).toBe(buildStyledVariationSuffix(1, hint))
  })
})
