export const PROVIDER_MODELS = {
  gemini: {
    image: ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'],
  },
  openai: {
    image: ['dall-e-3', 'dall-e-2'],
  },
  kling: {
    video: ['kling-2.6/image-to-video', 'kling-2.6/text-to-video'],
  },
  elevenlabs: {
    tts: [
      'elevenlabs/text-to-speech-multilingual-v2',
      'elevenlabs/text-to-speech-turbo-2-5',
    ],
  },
  suno: {
    bgm: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V5'],
  },
} as const

export const DEFAULT_MODELS = {
  image: 'gemini-2.5-flash-image',
  video: 'kling-2.6/image-to-video',
  tts: 'elevenlabs/text-to-speech-multilingual-v2',
  bgm: 'V4_5',
} as const

export const ELEVENLABS_VOICES = [
  'Rachel',
  'Aria',
  'Roger',
  'Sarah',
  'Laura',
  'Charlie',
  'George',
  'Callum',
  'River',
  'Liam',
  'Charlotte',
  'Alice',
  'Matilda',
  'Will',
  'Jessica',
  'Eric',
  'Chris',
  'Brian',
  'Daniel',
  'Lily',
  'Bill',
] as const

export const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '2:3', label: '2:3 (Portrait)' },
  { value: '3:2', label: '3:2 (Landscape)' },
  { value: '3:4', label: '3:4 (Portrait)' },
  { value: '4:3', label: '4:3 (Landscape)' },
  { value: '4:5', label: '4:5 (Portrait)' },
  { value: '5:4', label: '5:4 (Landscape)' },
  { value: '9:16', label: '9:16 (Mobile)' },
  { value: '16:9', label: '16:9 (Widescreen)' },
  { value: '21:9', label: '21:9 (Ultrawide)' },
] as const

export const COST_PER_GENERATION = {
  gemini: {
    image: 0.02,
  },
  openai: {
    image: 0.04,
  },
  kling: {
    video_5s: 0.15,
    video_10s: 0.28,
  },
  elevenlabs: {
    tts: 0.01,
  },
  suno: {
    bgm: 0.05,
  },
} as const

// ============================================================
// Kids Animation Constants
// ============================================================

// Legacy 품질 프리셋 (하위 호환용)
export const KIDS_QUALITY_PRESETS = {
  draft: {
    label: 'Draft',
    description: '5초 고정, 빠른 테스트용',
    videoDuration: 5 as const,
    imageModel: 'gemini-2.5-flash-image',
    maxShots: 5,
  },
  standard: {
    label: 'Standard',
    description: '5~10초 유동, 일반 제작',
    videoDuration: 'dynamic' as const,
    imageModel: 'gemini-2.5-flash-image',
    maxShots: 7,
  },
  premium: {
    label: 'Premium',
    description: '10초, 고품질',
    videoDuration: 10 as const,
    imageModel: 'gemini-3-pro-image-preview',
    maxShots: 10,
  },
} as const

// 폼 팩터 프리셋 (롱폼/숏폼)
export const KIDS_FORM_FACTOR_PRESETS = {
  longform: {
    label: '롱폼 (16:9)',
    description: 'YouTube, 태블릿, TV용 가로 영상',
    aspectRatio: '16:9' as const,
    resolution: '2K' as const,
    // 앵커 이미지 설정
    anchor: {
      character: {
        aspectRatio: '1:1' as const, // 캐릭터는 정사각형
        resolution: '2K' as const,
      },
      background: {
        aspectRatio: '16:9' as const, // 배경은 영상 비율과 동일
        resolution: '2K' as const,
      },
    },
    // 샷 이미지 설정
    shot: {
      aspectRatio: '16:9' as const,
      resolution: '2K' as const,
    },
    // 비디오 설정
    video: {
      aspectRatio: '16:9' as const,
      duration: 'dynamic' as const, // 5초 또는 10초
    },
    maxShots: 7,
  },
  shortform: {
    label: '숏폼 (9:16)',
    description: 'TikTok, Reels, Shorts용 세로 영상',
    aspectRatio: '9:16' as const,
    resolution: '2K' as const,
    // 앵커 이미지 설정
    anchor: {
      character: {
        aspectRatio: '1:1' as const, // 캐릭터는 정사각형
        resolution: '2K' as const,
      },
      background: {
        aspectRatio: '9:16' as const, // 배경은 영상 비율과 동일
        resolution: '2K' as const,
      },
    },
    // 샷 이미지 설정
    shot: {
      aspectRatio: '9:16' as const,
      resolution: '2K' as const,
    },
    // 비디오 설정
    video: {
      aspectRatio: '9:16' as const,
      duration: 'dynamic' as const,
    },
    maxShots: 7,
  },
} as const

export const KIDS_ANIMATION_STYLES = {
  pixar: {
    label: 'Pixar',
    description: '감정/성장/교훈',
    characteristics: '상징적 이미지, 한 오브제로 이야기 암시',
    visualPromptSuffix:
      'Pixar animation style, soft lighting, emotional depth, 3D rendered, warm colors',
  },
  disney: {
    label: 'Disney',
    description: '뮤지컬/동화',
    characteristics: '클래식 구도, 앙상블 캐릭터 배치',
    visualPromptSuffix:
      'Disney animation style, classic composition, magical atmosphere, vibrant colors',
  },
  dreamworks: {
    label: 'DreamWorks',
    description: '코미디/액션',
    characteristics: '과장된 포즈, 다이내믹 앵글',
    visualPromptSuffix:
      'DreamWorks animation style, dynamic angles, exaggerated expressions, action-oriented',
  },
} as const

export const KIDS_THUMBNAIL_STYLES = {
  auto: {
    label: '자동',
    description: '애니메이션 스타일과 동일',
  },
  pixar: {
    label: 'Pixar',
    description: '상징적 이미지, 한 오브제로 이야기 암시',
  },
  disney: {
    label: 'Disney',
    description: '클래식 구도, 앙상블 캐릭터 배치',
  },
  dreamworks: {
    label: 'DreamWorks',
    description: '과장된 포즈, 다이내믹 앵글',
  },
} as const

export const KIDS_ANCHOR_CATEGORIES = {
  character: {
    label: '캐릭터',
    description: '주인공 및 등장인물',
    minCount: 1,
    maxCount: 5,
  },
  background: {
    label: '배경',
    description: '주요 장소 및 환경',
    minCount: 1,
    maxCount: 3,
  },
} as const

// 비용 추정 (Kids Animation 파이프라인)
export const KIDS_COST_ESTIMATE = {
  draft: {
    shots: 5,
    imagesPerShot: 1,
    videoCost: 5 * 0.15, // 5 x 5초 비디오
    imageCost: 5 * 0.02, // 5 이미지
    ttsCost: 5 * 0.01, // 5 TTS
    bgmCost: 0.05,
    total: 0.95,
  },
  standard: {
    shots: 7,
    imagesPerShot: 1,
    videoCost: 7 * 0.2, // 혼합 (5초/10초)
    imageCost: 7 * 0.02,
    ttsCost: 7 * 0.01,
    bgmCost: 0.05,
    total: 1.66,
  },
  premium: {
    shots: 7,
    imagesPerShot: 1,
    videoCost: 7 * 0.28, // 7 x 10초 비디오
    imageCost: 7 * 0.04, // pro 모델
    ttsCost: 7 * 0.01,
    bgmCost: 0.05,
    total: 2.36,
  },
} as const

// MCP 도구 매핑
export const KIDS_MCP_TOOLS = {
  image: {
    generate: 'mcp__mediapack__nanobanana_generate',
    edit: 'mcp__mediapack__nanobanana_edit',
    batchEdit: 'mcp__mediapack__nanobanana_batch_edit',
  },
  video: {
    imageToVideo: 'mcp__mediapack__kling_image_to_video',
    // batch 버전은 이미지 매핑 오류로 사용 금지
  },
  audio: {
    tts: 'mcp__mediapack__elevenlabs_tts',
    batchTts: 'mcp__mediapack__elevenlabs_batch_tts',
    bgm: 'mcp__mediapack__suno_generate_bgm',
  },
} as const

// 배치 처리 제한
export const KIDS_BATCH_LIMITS = {
  image: 7, // nanobanana_batch_edit 최대 7개
  tts: 7, // elevenlabs_batch_tts 최대 7개
  video: 1, // kling은 개별 처리만 (batch 사용 금지)
} as const

// TTS 음성 프로필 (Kids Animation 전용)
export const KIDS_VOICE_PROFILES = {
  narrator: {
    voiceId: 'Rachel',
    style: 'warm, storytelling tone, clear enunciation',
    speed: 0.95,
    stability: 0.75,
  },
  child_protagonist: {
    voiceId: 'Lily',
    style: 'energetic, curious, slightly high-pitched',
    speed: 1.0,
    stability: 0.7,
  },
  friendly_sidekick: {
    voiceId: 'Charlotte',
    style: 'cheerful, supportive, gentle',
    speed: 1.05,
    stability: 0.7,
  },
  wise_mentor: {
    voiceId: 'Brian',
    style: 'calm, wise, reassuring',
    speed: 0.9,
    stability: 0.8,
  },
  playful_animal: {
    voiceId: 'Callum',
    style: 'playful, expressive, animated',
    speed: 1.1,
    stability: 0.6,
  },
} as const

// 감정별 TTS 파라미터 조정
export const KIDS_EMOTION_TTS_PARAMS = {
  hopeful: { stability: 0.7, style: 0.4, speed: 1.0 },
  curious: { stability: 0.6, style: 0.5, speed: 1.05 },
  excited: { stability: 0.5, style: 0.7, speed: 1.15 },
  peaceful: { stability: 0.8, style: 0.2, speed: 0.9 },
  surprised: { stability: 0.5, style: 0.8, speed: 1.1 },
  sad: { stability: 0.7, style: 0.3, speed: 0.85 },
  brave: { stability: 0.6, style: 0.6, speed: 1.0 },
  joyful: { stability: 0.5, style: 0.8, speed: 1.1 },
  neutral: { stability: 0.75, style: 0.3, speed: 1.0 },
} as const

// 6-Act Zootopia Protocol 정의
export const KIDS_ZOOTOPIA_ACTS = {
  hook: {
    label: '도입 (Hook)',
    description: '주인공의 꿈과 열망 소개',
    typicalDuration: 10,
    emotionRange: ['hopeful', 'curious', 'excited', 'peaceful'],
  },
  duo: {
    label: '만남 (Duo)',
    description: '파트너 캐릭터와의 운명적 만남',
    typicalDuration: 10,
    emotionRange: ['surprised', 'suspicious', 'intrigued', 'friendly'],
  },
  journey: {
    label: '여정 (Journey)',
    description: '함께 모험하며 성장',
    typicalDuration: 15,
    emotionRange: ['determined', 'adventurous', 'struggling', 'learning'],
  },
  twist: {
    label: '반전 (Twist)',
    description: '예상치 못한 위기 또는 배신',
    typicalDuration: 10,
    emotionRange: ['shocked', 'betrayed', 'sad', 'confused'],
  },
  action: {
    label: '액션 (Action)',
    description: '결전과 극복',
    typicalDuration: 10,
    emotionRange: ['brave', 'intense', 'heroic', 'united'],
  },
  resolution: {
    label: '해결 (Resolution)',
    description: '교훈과 해피엔딩',
    typicalDuration: 10,
    emotionRange: ['joyful', 'proud', 'grateful', 'hopeful'],
  },
} as const
