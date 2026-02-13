import type { WorkflowPolicy, StepModelPolicy } from './types'

// ─── Kids Animation ───

export const KIDS_ANIMATION_POLICY: WorkflowPolicy = {
  workflowId: 'kids-animation',
  label: 'Kids Animation',
  steps: {
    'anchors:text-to-image': {
      allowedModels: ['nano-banana-pro'],
      defaultModel: 'nano-banana-pro',
      featured: ['nano-banana-pro'],
      fallbacks: { 'nano-banana-pro': 'gemini-3-pro-image-preview' },
      recommendedModel: 'nano-banana-pro',
    },
    'expand:image-to-image': {
      allowedModels: ['fal-ai/nano-banana-pro/edit'],
      defaultModel: 'fal-ai/nano-banana-pro/edit',
      featured: ['fal-ai/nano-banana-pro/edit'],
      fallbacks: { 'fal-ai/nano-banana-pro/edit': 'gemini-3-pro-image-preview' },
      recommendedModel: 'fal-ai/nano-banana-pro/edit',
    },
    'shots:image-to-image': {
      allowedModels: ['fal-ai/nano-banana-pro/edit'],
      defaultModel: 'fal-ai/nano-banana-pro/edit',
      featured: ['fal-ai/nano-banana-pro/edit'],
      fallbacks: { 'fal-ai/nano-banana-pro/edit': 'gemini-3-pro-image-preview' },
      recommendedModel: 'fal-ai/nano-banana-pro/edit',
    },
    'videos:image-to-video': {
      allowedModels: [
        'kling/v2-5-turbo-image-to-video-pro',
        'kling-2.6/image-to-video',
        'kling-3.0/video',
        'hailuo/2-3-image-to-video-pro',
        'wan/2-6-image-to-video',
        'grok-imagine/image-to-video',
      ],
      defaultModel: 'kling-2.6/image-to-video',
      featured: ['kling/v2-5-turbo-image-to-video-pro', 'kling-2.6/image-to-video', 'kling-3.0/video'],
      fallbacks: {
        'kling-2.6/image-to-video': 'fal-ai/kling-video/v2.6/pro/image-to-video',
        'kling-3.0/video': 'fal-ai/kling-video/v3/standard/image-to-video',
        'hailuo/2-3-image-to-video-pro': 'fal-ai/minimax/hailuo-02/pro/image-to-video',
      },
      recommendedModel: 'kling-2.6/image-to-video',
    },
    'audio:tts': {
      allowedModels: [
        'fal-ai/elevenlabs/tts/multilingual-v2',
        'fal-ai/elevenlabs/tts/turbo-v2.5',
      ],
      defaultModel: 'fal-ai/elevenlabs/tts/multilingual-v2',
      featured: [
        'fal-ai/elevenlabs/tts/multilingual-v2',
        'fal-ai/elevenlabs/tts/turbo-v2.5',
      ],
      fallbacks: {
        'fal-ai/elevenlabs/tts/multilingual-v2': 'elevenlabs/text-to-speech-multilingual-v2',
        'fal-ai/elevenlabs/tts/turbo-v2.5': 'elevenlabs/text-to-speech-turbo-2-5',
      },
      recommendedModel: 'fal-ai/elevenlabs/tts/multilingual-v2',
    },
    'audio:secondary:bgm': {
      allowedModels: ['V4_5', 'V5', 'V4_5PLUS', 'V4', 'V3_5'],
      defaultModel: 'V4_5',
      featured: ['V4_5', 'V5', 'V4_5PLUS'],
      fallbacks: {},
      recommendedModel: 'V4_5',
    },
  },
}

// ─── Registry ───

const WORKFLOW_POLICIES: Record<string, WorkflowPolicy> = {
  'kids-animation': KIDS_ANIMATION_POLICY,
}

/** 워크플로우 정책 조회 (없으면 null) */
export function getWorkflowPolicy(workflowId: string): WorkflowPolicy | null {
  return WORKFLOW_POLICIES[workflowId] ?? null
}

/**
 * 워크플로우의 특정 스텝 정책 조회
 *
 * key 형식: `${stepId}:${capability}` (예: 'videos:image-to-video')
 */
export function getStepPolicy(
  workflowId: string,
  stepId: string,
  capability: string,
): StepModelPolicy | null {
  const policy = WORKFLOW_POLICIES[workflowId]
  if (!policy) return null
  return policy.steps[`${stepId}:${capability}`] ?? null
}
