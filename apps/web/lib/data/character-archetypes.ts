export interface CharacterArchetypePreset {
  visualStyle: string
  visualDescription: string
  colorSuggestions: string[]
  personalityHint: string
  promptKeywords: string[]
}

export interface ArchetypeParamOption {
  value: string    // 영어 — LLM 프롬프트용
  label: string    // 한국어 — UI 표시용
}

export interface ArchetypeParam {
  id: string
  label: string
  options: ArchetypeParamOption[]
  defaultValue: string
  priority: 'primary' | 'advanced'
}

/** 금지 조합 규칙: condition이 모두 충족되면 해당 아키타입+파라미터 차단 */
export interface ParamConstraint {
  archetypeId: string
  disallowWhen: Record<string, string[]>
  reason: string
}

export interface CharacterArchetype {
  id: string
  label: string
  thumbnailUrl: string
  preset: CharacterArchetypePreset
  parameters?: ArchetypeParam[]
}

// ============================================================
// 공통 파라미터 팩토리
// ============================================================

const GENDER_PARAM = (defaultValue = 'male'): ArchetypeParam => ({
  id: 'gender', label: '성별', priority: 'primary',
  options: [
    { value: 'male', label: '남성' },
    { value: 'female', label: '여성' },
    { value: 'neutral', label: '중성적' },
  ],
  defaultValue,
})

const AGE_GROUP_PARAM = (defaultValue = 'child (5-10)'): ArchetypeParam => ({
  id: 'ageGroup', label: '나이대', priority: 'primary',
  options: [
    { value: 'child (5-10)', label: '어린이' },
    { value: 'teen (13-17)', label: '청소년' },
    { value: 'young adult (20-25)', label: '청년' },
    { value: 'adult (30-40)', label: '성인' },
  ],
  defaultValue,
})

// ============================================================
// 금지 조합 정의
// ============================================================

export const PARAM_CONSTRAINTS: ParamConstraint[] = [
  {
    archetypeId: 'dark-mood-mystery',
    disallowWhen: { ageGroup: ['child (5-10)', 'teen (13-17)'] },
    reason: '다크 무드 아키타입은 미성년 캐릭터에 사용할 수 없습니다',
  },
]

/** 주어진 아키타입+params 조합이 금지인지 확인 */
export function getViolatedConstraint(
  archetypeId: string,
  params: Record<string, string>,
): ParamConstraint | null {
  for (const c of PARAM_CONSTRAINTS) {
    if (c.archetypeId !== archetypeId) continue
    const violated = Object.entries(c.disallowWhen).every(
      ([paramId, forbidden]) => forbidden.includes(params[paramId] || ''),
    )
    if (violated) return c
  }
  return null
}

/** 금지 조합 기반으로 특정 파라미터의 비활성 옵션 반환 */
export function getDisabledOptions(
  archetypeId: string,
  paramId: string,
  currentParams: Record<string, string>,
): Set<string> {
  const disabled = new Set<string>()
  for (const c of PARAM_CONSTRAINTS) {
    if (c.archetypeId !== archetypeId) continue
    const forbiddenValues = c.disallowWhen[paramId]
    if (!forbiddenValues) continue
    // 다른 조건이 모두 충족되는 경우에만 이 paramId의 값을 비활성화
    const otherConditionsMet = Object.entries(c.disallowWhen).every(([pid, vals]) => {
      if (pid === paramId) return true
      return vals.includes(currentParams[pid] || '')
    })
    if (otherConditionsMet) {
      forbiddenValues.forEach((v) => disabled.add(v))
    }
  }
  return disabled
}

// ============================================================
// 아키타입 데이터
// ============================================================

export const CHARACTER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: 'bright-3d-boy',
    label: '3D 애니메이션',
    thumbnailUrl: '/archetypes/bright-3d-boy.png',
    preset: {
      visualStyle: 'bright-3d',
      visualDescription: 'Cheerful character with big expressive eyes, round face, soft 3D rendering with warm lighting',
      colorSuggestions: ['#4ECDC4', '#FF6B6B', '#FFE66D', '#45B7D1'],
      personalityHint: '활발하고 호기심 많은 모험가',
      promptKeywords: ['Pixar 3D animation style', 'Disney 3D rendering', 'bright colors', 'soft lighting', 'expressive eyes', 'round features'],
    },
    parameters: [GENDER_PARAM('male'), AGE_GROUP_PARAM('child (5-10)')],
  },
  {
    id: 'watercolor-fantasy-witch',
    label: '판타지(수채화)',
    thumbnailUrl: '/archetypes/watercolor-fantasy-witch.png',
    preset: {
      visualStyle: 'watercolor-fantasy',
      visualDescription: 'Magical character with flowing hair, mystical aura, soft watercolor textures and ethereal atmosphere',
      colorSuggestions: ['#7B68EE', '#DDA0DD', '#87CEEB', '#F0E68C'],
      personalityHint: '신비롭고 다정한 마법의 수호자',
      promptKeywords: ['Studio Ghibli watercolor', 'Hayao Miyazaki style', 'ethereal atmosphere', 'magical glow', 'soft brush strokes'],
    },
    parameters: [GENDER_PARAM('female'), AGE_GROUP_PARAM('teen (13-17)')],
  },
  {
    id: 'round-mascot-animal',
    label: '동물 캐릭터',
    thumbnailUrl: '/archetypes/round-mascot-animal.png',
    preset: {
      visualStyle: 'round-mascot',
      visualDescription: 'Adorable round animal mascot with simple features, pastel colors, minimal details, kawaii proportions',
      colorSuggestions: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA'],
      personalityHint: '사랑스럽고 장난기 가득한 마스코트',
      promptKeywords: ['Sanrio style', 'LINE Friends character', 'Kakao Friends style', 'kawaii mascot', 'round proportions', 'pastel colors'],
    },
    parameters: [{
      id: 'species', label: '동물 종류', priority: 'primary',
      options: [
        { value: 'cat', label: '고양이' },
        { value: 'dog', label: '강아지' },
        { value: 'bear', label: '곰' },
        { value: 'rabbit', label: '토끼' },
        { value: 'penguin', label: '펭귄' },
      ],
      defaultValue: 'cat',
    }],
  },
  {
    id: 'dark-mood-mystery',
    label: '다크 히어로',
    thumbnailUrl: '/archetypes/dark-mood-mystery.png',
    preset: {
      visualStyle: 'dark-mood',
      visualDescription: 'Mysterious character with sharp features, dramatic lighting, dark clothing, intense gaze',
      colorSuggestions: ['#2C003E', '#FF0055', '#1A1A2E', '#E94560'],
      personalityHint: '카리스마 넘치는 미스터리한 인물',
      promptKeywords: ['Persona 5 art style', 'Arcane Netflix aesthetic', 'dramatic noir lighting', 'sharp angular features', 'high contrast'],
    },
    parameters: [GENDER_PARAM('male'), AGE_GROUP_PARAM('young adult (20-25)')],
  },
  {
    id: 'mini-fairy',
    label: '미니 요정',
    thumbnailUrl: '/archetypes/mini-fairy.png',
    preset: {
      visualStyle: 'mini-chibi',
      visualDescription: 'Tiny fairy character with oversized head, sparkly wings, cute chibi proportions, glowing particles',
      colorSuggestions: ['#FF69B4', '#00CED1', '#FFD700', '#98FB98'],
      personalityHint: '장난꾸러기지만 순수한 요정',
      promptKeywords: ['chibi anime style', 'Genshin Impact character design', 'super deformed proportions', 'sparkle effects', 'cute fantasy'],
    },
    parameters: [
      GENDER_PARAM('female'),
      {
        id: 'fairyElement', label: '요정 속성', priority: 'advanced',
        options: [
          { value: 'flower', label: '꽃' },
          { value: 'star', label: '별' },
          { value: 'water', label: '물' },
          { value: 'fire', label: '불' },
        ],
        defaultValue: 'flower',
      },
    ],
  },
  {
    id: 'webtoon-hip-teen',
    label: '웹툰',
    thumbnailUrl: '/archetypes/webtoon-hip-teen.png',
    preset: {
      visualStyle: 'webtoon-modern',
      visualDescription: 'Stylish Korean teen character with trendy outfit, clean line art, modern webtoon aesthetic, expressive face',
      colorSuggestions: ['#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9'],
      personalityHint: '트렌디하고 자신감 넘치는 10대',
      promptKeywords: ['Korean webtoon style', 'True Beauty manhwa', 'Naver Webtoon aesthetic', 'clean line art', 'modern fashion', 'expressive eyes'],
    },
    parameters: [
      GENDER_PARAM('female'),
      {
        id: 'fashionStyle', label: '패션 스타일', priority: 'advanced',
        options: [
          { value: 'streetwear', label: '스트릿' },
          { value: 'preppy', label: '프레피' },
          { value: 'casual', label: '캐주얼' },
          { value: 'sporty', label: '스포티' },
        ],
        defaultValue: 'streetwear',
      },
    ],
  },
  {
    id: 'watercolor-emotional-girl',
    label: '감성(수채화)',
    thumbnailUrl: '/archetypes/watercolor-emotional-girl.png',
    preset: {
      visualStyle: 'watercolor-emotional',
      visualDescription: 'Dreamy character with soft features, flowing hair, watercolor wash backgrounds, emotional lighting',
      colorSuggestions: ['#E6B0AA', '#AED6F1', '#F9E79F', '#D7BDE2'],
      personalityHint: '감성적이고 섬세한 캐릭터',
      promptKeywords: ['Makoto Shinkai art style', 'Your Name anime aesthetic', 'emotional watercolor', 'soft bokeh lighting', 'dreamy atmosphere'],
    },
    parameters: [GENDER_PARAM('female'), AGE_GROUP_PARAM('teen (13-17)')],
  },
  {
    id: 'mecha-sf-ai',
    label: 'SF',
    thumbnailUrl: '/archetypes/mecha-sf-ai.png',
    preset: {
      visualStyle: 'mecha-sf',
      visualDescription: 'Futuristic AI assistant character with sleek armor, holographic elements, neon accents, cyberpunk aesthetic',
      colorSuggestions: ['#00FFFF', '#0D0D0D', '#FF00FF', '#39FF14'],
      personalityHint: '논리적이지만 인간미 있는 AI',
      promptKeywords: ['Evangelion mecha design', 'Ghost in the Shell cyberpunk', 'cyberpunk neon aesthetic', 'holographic UI', 'futuristic armor'],
    },
    parameters: [
      {
        id: 'robotType', label: '로봇 유형', priority: 'primary',
        options: [
          { value: 'humanoid', label: '휴머노이드' },
          { value: 'mecha', label: '메카' },
          { value: 'android', label: '안드로이드' },
        ],
        defaultValue: 'humanoid',
      },
      {
        id: 'era', label: '시대', priority: 'advanced',
        options: [
          { value: 'near-future', label: '근미래' },
          { value: 'far-future', label: '먼 미래' },
          { value: 'cyberpunk', label: '사이버펑크' },
        ],
        defaultValue: 'near-future',
      },
    ],
  },
  {
    id: 'eastern-traditional-hanbok',
    label: '한복',
    thumbnailUrl: '/archetypes/eastern-traditional-hanbok.png',
    preset: {
      visualStyle: 'eastern-traditional',
      visualDescription: 'Character in traditional Korean hanbok, elegant pose, traditional patterns, ink wash background elements',
      colorSuggestions: ['#C0392B', '#1E8449', '#F1C40F', '#2C3E50'],
      personalityHint: '우아하고 지혜로운 전통 캐릭터',
      promptKeywords: ['traditional Korean hanbok illustration', 'ukiyo-e inspired', 'ink wash painting', 'elegant traditional patterns', 'East Asian aesthetic'],
    },
    parameters: [
      GENDER_PARAM('female'),
      {
        id: 'hanbokRole', label: '역할', priority: 'advanced',
        options: [
          { value: 'noble', label: '양반' },
          { value: 'warrior', label: '무사' },
          { value: 'scholar', label: '선비' },
          { value: 'dancer', label: '무용가' },
        ],
        defaultValue: 'noble',
      },
    ],
  },
  {
    id: 'freetext',
    label: '커스텀',
    thumbnailUrl: '/archetypes/freetext.png',
    preset: {
      visualStyle: '',
      visualDescription: '',
      colorSuggestions: [],
      personalityHint: '',
      promptKeywords: [],
    },
    parameters: [GENDER_PARAM('neutral'), AGE_GROUP_PARAM('young adult (20-25)')],
  },
]

// ============================================================
// 유틸
// ============================================================

export function getArchetypeById(id: string): CharacterArchetype | undefined {
  return CHARACTER_ARCHETYPES.find((a) => a.id === id)
}

/** 아키타입의 전체 파라미터 기본값 맵 생성 */
export function getDefaultParams(archetypeId: string): Record<string, string> {
  const arch = getArchetypeById(archetypeId)
  if (!arch?.parameters) return {}
  const defaults: Record<string, string> = {}
  for (const p of arch.parameters) {
    defaults[p.id] = p.defaultValue
  }
  return defaults
}
