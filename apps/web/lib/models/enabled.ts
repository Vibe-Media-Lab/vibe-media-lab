import type { ModelCapability, EnabledConfig } from './types'

/**
 * 활성 모델 설정
 *
 * 이 파일만 수정하면 모델 활성/비활성/승격/강등 가능.
 * catalog.ts에 등록된 모델 중 운영 환경에 노출할 모델만 선택한다.
 */
export const ENABLED: Record<ModelCapability, EnabledConfig> = {
  'image-to-video': {
    models: [
      // kieai
      'kling/v2-5-turbo-image-to-video-pro',
      'kling-2.6/image-to-video',
      'kling-3.0/video',
      'bytedance/seedance-1.5-pro',
      'hailuo/2-3-image-to-video-pro',
      'wan/2-6-image-to-video',
      'sora-2-image-to-video',
      'sora-2-pro-image-to-video',
      'grok-imagine/image-to-video',
      'veo3_fast',
      'veo3',
      'runway/generate',
      // fal (kieai 중복 제외)
      'fal-ai/kling-video/v2.6/pro/image-to-video',
      'fal-ai/minimax/hailuo-02/standard/image-to-video',
    ],
    featured: [
      'kling/v2-5-turbo-image-to-video-pro',
      'kling-2.6/image-to-video',
      'kling-3.0/video',
    ],
    defaultId: 'kling-2.6/image-to-video',
    recommendedId: 'kling-2.6/image-to-video',
    fallbacks: {
      'kling-2.6/image-to-video': 'fal-ai/kling-video/v2.6/pro/image-to-video',
      'kling-3.0/video': 'fal-ai/kling-video/v3/standard/image-to-video',
      'hailuo/2-3-image-to-video-pro': 'fal-ai/minimax/hailuo-02/pro/image-to-video',
      'veo3': 'fal-ai/veo3',
      'veo3_fast': 'fal-ai/veo3',
    },
  },

  'text-to-image': {
    models: [
      'fal-ai/flux-2-pro',
      'fal-ai/flux-2-flex',
      'fal-ai/flux-2-max',
      'fal-ai/bytedance/seedream/v4.5/text-to-image',
      'fal-ai/bytedance/seedream/v4/text-to-image',
      'fal-ai/gpt-image-1.5',
      'fal-ai/reve/text-to-image',
      'wan/v2.6/text-to-image',
      'nano-banana-pro',
    ],
    featured: [
      'fal-ai/flux-2-pro',
      'fal-ai/bytedance/seedream/v4.5/text-to-image',
      'nano-banana-pro',
    ],
    defaultId: 'nano-banana-pro',
    recommendedId: 'fal-ai/flux-2-pro',
    fallbacks: {
      'nano-banana-pro': 'gemini-3-pro-image-preview',
      'fal-ai/flux-2-pro': 'gemini-3-pro-image-preview',
      'fal-ai/flux-2-flex': 'gemini-3-pro-image-preview',
      'fal-ai/flux-2-max': 'gemini-3-pro-image-preview',
      'fal-ai/bytedance/seedream/v4.5/text-to-image': 'gemini-3-pro-image-preview',
      'fal-ai/bytedance/seedream/v4/text-to-image': 'gemini-3-pro-image-preview',
      'fal-ai/gpt-image-1.5': 'gemini-3-pro-image-preview',
      'fal-ai/reve/text-to-image': 'gemini-3-pro-image-preview',
      'wan/v2.6/text-to-image': 'gemini-3-pro-image-preview',
    },
  },

  'image-to-image': {
    models: [
      'fal-ai/flux-2-pro/edit',
      'fal-ai/nano-banana-pro/edit',
      'fal-ai/flux-2-flex/edit',
      'fal-ai/flux-2-max/edit',
      'fal-ai/bytedance/seedream/v4.5/edit',
      'fal-ai/bytedance/seedream/v4/edit',
      'fal-ai/gpt-image-1.5/edit',
      'fal-ai/reve/edit',
      'wan/v2.6/image-to-image',
    ],
    featured: [
      'fal-ai/flux-2-pro/edit',
      'fal-ai/nano-banana-pro/edit',
      'fal-ai/bytedance/seedream/v4.5/edit',
    ],
    defaultId: 'fal-ai/nano-banana-pro/edit',
    recommendedId: 'fal-ai/flux-2-pro/edit',
    fallbacks: {
      'fal-ai/nano-banana-pro/edit': 'gemini-3-pro-image-preview',
      'fal-ai/flux-2-pro/edit': 'gemini-3-pro-image-preview',
      'fal-ai/flux-2-flex/edit': 'gemini-3-pro-image-preview',
      'fal-ai/flux-2-max/edit': 'gemini-3-pro-image-preview',
      'fal-ai/bytedance/seedream/v4.5/edit': 'gemini-3-pro-image-preview',
      'fal-ai/bytedance/seedream/v4/edit': 'gemini-3-pro-image-preview',
      'fal-ai/gpt-image-1.5/edit': 'gemini-3-pro-image-preview',
      'fal-ai/reve/edit': 'gemini-3-pro-image-preview',
      'wan/v2.6/image-to-image': 'gemini-3-pro-image-preview',
    },
  },

  'tts': {
    models: [
      'fal-ai/elevenlabs/tts/multilingual-v2',
      'fal-ai/elevenlabs/tts/turbo-v2.5',
    ],
    featured: [
      'fal-ai/elevenlabs/tts/multilingual-v2',
      'fal-ai/elevenlabs/tts/turbo-v2.5',
    ],
    defaultId: 'fal-ai/elevenlabs/tts/multilingual-v2',
    recommendedId: 'fal-ai/elevenlabs/tts/multilingual-v2',
    fallbacks: {
      'fal-ai/elevenlabs/tts/multilingual-v2': 'elevenlabs/text-to-speech-multilingual-v2',
      'fal-ai/elevenlabs/tts/turbo-v2.5': 'elevenlabs/text-to-speech-turbo-2-5',
    },
  },

  'bgm': {
    models: ['V4_5', 'V5', 'V4_5PLUS', 'V4', 'V3_5'],
    featured: ['V4_5', 'V5', 'V4_5PLUS'],
    defaultId: 'V4_5',
    recommendedId: 'V4_5',
    fallbacks: {},
  },

  'text-to-video': {
    models: [
      // kieai
      'kling-2.6/text-to-video',
      'kling-3.0/video',
      'bytedance/seedance-1.5-pro',
      'wan/2-6-text-to-video',
      'sora-2-text-to-video',
      'sora-2-pro-text-to-video',
      'veo3_fast',
      'veo3',
      'runway/generate',
      // fal (kieai 중복 제외)
      'fal-ai/minimax/hailuo-02/pro/text-to-video',
      'fal-ai/luma-dream-machine/ray-2-flash',
    ],
    featured: [
      'kling-2.6/text-to-video',
      'kling-3.0/video',
    ],
    defaultId: 'kling-2.6/text-to-video',
    recommendedId: 'kling-2.6/text-to-video',
    fallbacks: {
      'kling-2.6/text-to-video': 'fal-ai/kling-video/v3/standard/text-to-video',
      'kling-3.0/video': 'fal-ai/kling-video/v3/standard/text-to-video',
      'veo3': 'fal-ai/veo3',
      'veo3_fast': 'fal-ai/veo3',
    },
  },

  'composition': { models: [], featured: [], defaultId: '', recommendedId: '', fallbacks: {} },

  'llm': {
    models: ['gemini-3-flash-preview', 'gemini-3.1-pro-preview'],
    featured: ['gemini-3-flash-preview', 'gemini-3.1-pro-preview'],
    defaultId: 'gemini-3-flash-preview',
    recommendedId: 'gemini-3-flash-preview',
    fallbacks: {
      'gemini-3.1-pro-preview': 'gemini-3-flash-preview',
    },
  },
}
