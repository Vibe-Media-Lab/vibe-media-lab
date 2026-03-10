import { describe, it, expect } from 'vitest'
import { shouldShowContainerAction } from '../workflow-store'
import { TEMPLATES } from '@/lib/data/templates'
import type { WorkflowStep, WorkflowStepConfig } from '@vibe-media-lab/shared'

describe('shouldShowContainerAction', () => {
  const getLastStep = (templateId: string) => {
    const t = TEMPLATES.find((tmpl) => tmpl.id === templateId)
    if (!t) throw new Error(`Template ${templateId} not found`)
    return t.workflow.steps[t.workflow.steps.length - 1]!
  }

  const makeStep = (type: string, previewType?: string): WorkflowStep => ({
    id: 'test',
    type: type as WorkflowStep['type'],
    label: 'Test',
    required: true,
    config: (previewType
      ? { generateAction: 'test', previewType }
      : { fields: [] }) as WorkflowStepConfig,
  })

  // --- 실제 템플릿 기반 ---

  it('Kids Animation (video-player) → true', () => {
    expect(shouldShowContainerAction(getLastStep('kids-animation'))).toBe(true)
  })

  it('Character Creator (character-profile) → false', () => {
    expect(shouldShowContainerAction(getLastStep('character-creator'))).toBe(false)
  })

  it.each([
    'brainrot',
    'storytime',
    'aicover',
    'factbomb',
    'tutorial',
    'aesthetic',
  ])('%s (ai-generate) → false', (id) => {
    expect(shouldShowContainerAction(getLastStep(id))).toBe(false)
  })

  it.each([
    'satisfying',
    'gameplay',
    'duet',
    'meme',
    'challenge',
    'compare',
  ])('%s (stub, no output contract) → false', (id) => {
    expect(shouldShowContainerAction(getLastStep(id))).toBe(false)
  })

  // --- previewType 분기 직접 테스트 ---

  it('generation-review + video-player → true', () => {
    expect(shouldShowContainerAction(makeStep('generation-review', 'video-player'))).toBe(true)
  })

  it.each([
    'text',
    'shot-list',
    'image-grid',
    'shot-gallery',
    'video-timeline',
    'audio-player',
    'image-select',
    'character-quickstart',
    'character-profile',
  ])('generation-review + %s → false', (previewType) => {
    expect(shouldShowContainerAction(makeStep('generation-review', previewType))).toBe(false)
  })

  it.each([
    'config',
    'text-input',
    'style-select',
    'media-upload',
  ])('%s step type → false', (type) => {
    expect(shouldShowContainerAction(makeStep(type))).toBe(false)
  })
})
