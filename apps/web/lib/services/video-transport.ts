/**
 * Video Transport Schema
 *
 * 24개 비디오 모델별 API 차이를 정의한다.
 * 미등록 모델 → fail-closed 에러.
 */

import { FalError } from './fal-client'
import { KieaiError } from './kieai-client'

// ─── Types ───

export type VideoApiType = 'kieai-standard' | 'kieai-veo' | 'kieai-runway' | 'fal'

export interface VideoTransport {
  apiType: VideoApiType
  /** 입력 빌드 시 분기 키 */
  family: string
  capabilities: ('image-to-video' | 'text-to-video')[]
  defaultDuration: string
}

// ─── Transport Map (23개 모델) ───

export const VIDEO_TRANSPORT_MAP: Record<string, VideoTransport> = {
  // ── kieai Standard (13개) ──
  'kling/v2-5-turbo-image-to-video-pro': {
    apiType: 'kieai-standard',
    family: 'kling-turbo',
    capabilities: ['image-to-video'],
    defaultDuration: '5',
  },
  'kling-2.6/image-to-video': {
    apiType: 'kieai-standard',
    family: 'kling',
    capabilities: ['image-to-video'],
    defaultDuration: '5',
  },
  'kling-2.6/text-to-video': {
    apiType: 'kieai-standard',
    family: 'kling',
    capabilities: ['text-to-video'],
    defaultDuration: '5',
  },
  'kling-3.0/video': {
    apiType: 'kieai-standard',
    family: 'kling3',
    capabilities: ['image-to-video', 'text-to-video'],
    defaultDuration: '5',
  },
  'sora-2-image-to-video': {
    apiType: 'kieai-standard',
    family: 'sora2',
    capabilities: ['image-to-video'],
    defaultDuration: '10',
  },
  'sora-2-pro-image-to-video': {
    apiType: 'kieai-standard',
    family: 'sora2',
    capabilities: ['image-to-video'],
    defaultDuration: '10',
  },
  'sora-2-text-to-video': {
    apiType: 'kieai-standard',
    family: 'sora2',
    capabilities: ['text-to-video'],
    defaultDuration: '10',
  },
  'sora-2-pro-text-to-video': {
    apiType: 'kieai-standard',
    family: 'sora2',
    capabilities: ['text-to-video'],
    defaultDuration: '10',
  },
  'bytedance/seedance-1.5-pro': {
    apiType: 'kieai-standard',
    family: 'seedance',
    capabilities: ['image-to-video', 'text-to-video'],
    defaultDuration: '8',
  },
  'hailuo/2-3-image-to-video-pro': {
    apiType: 'kieai-standard',
    family: 'hailuo',
    capabilities: ['image-to-video'],
    defaultDuration: '6',
  },
  'wan/2-6-image-to-video': {
    apiType: 'kieai-standard',
    family: 'wan',
    capabilities: ['image-to-video'],
    defaultDuration: '5',
  },
  'wan/2-6-text-to-video': {
    apiType: 'kieai-standard',
    family: 'wan',
    capabilities: ['text-to-video'],
    defaultDuration: '5',
  },
  'grok-imagine/image-to-video': {
    apiType: 'kieai-standard',
    family: 'grok',
    capabilities: ['image-to-video'],
    defaultDuration: '6',
  },

  // ── kieai Veo (2개) ──
  'veo3': {
    apiType: 'kieai-veo',
    family: 'veo',
    capabilities: ['image-to-video', 'text-to-video'],
    defaultDuration: '8',
  },
  'veo3_fast': {
    apiType: 'kieai-veo',
    family: 'veo',
    capabilities: ['image-to-video', 'text-to-video'],
    defaultDuration: '8',
  },

  // ── kieai Runway (1개) ──
  'runway/generate': {
    apiType: 'kieai-runway',
    family: 'runway',
    capabilities: ['image-to-video', 'text-to-video'],
    defaultDuration: '10',
  },

  // ── fal.ai (8개) ──
  'fal-ai/kling-video/v2.6/pro/image-to-video': {
    apiType: 'fal',
    family: 'kling-fal',
    capabilities: ['image-to-video'],
    defaultDuration: '5',
  },
  'fal-ai/kling-video/v3/standard/image-to-video': {
    apiType: 'fal',
    family: 'kling3-fal',
    capabilities: ['image-to-video'],
    defaultDuration: '5',
  },
  'fal-ai/kling-video/v3/standard/text-to-video': {
    apiType: 'fal',
    family: 'kling3-fal',
    capabilities: ['text-to-video'],
    defaultDuration: '5',
  },
  'fal-ai/minimax/hailuo-02/standard/image-to-video': {
    apiType: 'fal',
    family: 'hailuo-fal',
    capabilities: ['image-to-video'],
    defaultDuration: '6',
  },
  'fal-ai/minimax/hailuo-02/pro/image-to-video': {
    apiType: 'fal',
    family: 'hailuo-fal',
    capabilities: ['image-to-video'],
    defaultDuration: '6',
  },
  'fal-ai/minimax/hailuo-02/pro/text-to-video': {
    apiType: 'fal',
    family: 'hailuo-fal',
    capabilities: ['text-to-video'],
    defaultDuration: '6',
  },
  'fal-ai/veo3': {
    apiType: 'fal',
    family: 'veo-fal',
    capabilities: ['image-to-video', 'text-to-video'],
    defaultDuration: '8',
  },
  'fal-ai/luma-dream-machine/ray-2-flash': {
    apiType: 'fal',
    family: 'luma',
    capabilities: ['text-to-video'],
    defaultDuration: '5',
  },
}

// ─── Lookup (fail-closed) ───

export function getVideoTransport(modelId: string): VideoTransport {
  const transport = VIDEO_TRANSPORT_MAP[modelId]
  if (!transport) {
    throw new KieaiError(
      `Unregistered video model: ${modelId}. Add transport config to VIDEO_TRANSPORT_MAP.`,
      500,
    )
  }
  return transport
}
