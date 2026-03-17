import { describe, it, expect } from 'vitest'
import { buildPortraitPrompts } from '@/lib/prompts/character-prompt-builder'

describe('buildPortraitPrompts', () => {
  it('styleHint 전달 시 스타일 prefix 포함', () => {
    const prompts = buildPortraitPrompts(
      { visualDescription: 'A boy with blue eyes', visualDescriptions: ['A boy with blue eyes'] },
      1,
      { visualStyle: 'bright-3d', promptKeywords: ['Pixar 3D'] },
    )
    expect(prompts[0]).toContain('Pixar-quality 3D')
    expect(prompts[0]).toContain('Avoid:')
  })

  it('styleHint 없으면 제네릭 폴백', () => {
    const prompts = buildPortraitPrompts(
      { visualDescription: 'A boy' },
      1,
    )
    expect(prompts[0]).toContain('Full-body character illustration')
    expect(prompts[0]).toContain('Avoid:')
  })

  it('visualDescriptions 배열에서 count만큼 슬라이싱', () => {
    const prompts = buildPortraitPrompts(
      {
        visualDescription: 'A',
        visualDescriptions: ['desc1', 'desc2', 'desc3', 'desc4'],
      },
      2,
      { visualStyle: 'watercolor-fantasy', promptKeywords: [] },
    )
    expect(prompts).toHaveLength(2)
    expect(prompts[0]).toContain('desc1')
    expect(prompts[1]).toContain('desc2')
  })

  it('visualDescriptions 없으면 단수로 count만큼 생성', () => {
    const prompts = buildPortraitPrompts(
      { visualDescription: 'A single desc' },
      3,
    )
    expect(prompts).toHaveLength(3)
    expect(prompts[0]).toContain('A single desc')
    expect(prompts[2]).toContain('A single desc')
  })
})
