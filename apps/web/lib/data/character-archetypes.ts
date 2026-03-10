export interface CharacterArchetypePreset {
  visualStyle: string
  visualDescription: string
  colorSuggestions: string[]
  personalityHint: string
  promptKeywords: string[]
}

export interface CharacterArchetype {
  id: string
  label: string
  thumbnailUrl: string
  preset: CharacterArchetypePreset
}

export const CHARACTER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: 'bright-3d-boy',
    label: '생동감 3D · 밝은 남자아이',
    thumbnailUrl: '/archetypes/bright-3d-boy.svg',
    preset: {
      visualStyle: 'bright-3d',
      visualDescription: 'Cheerful boy character with big expressive eyes, round face, soft 3D rendering with warm lighting',
      colorSuggestions: ['#4ECDC4', '#FF6B6B', '#FFE66D', '#45B7D1'],
      personalityHint: '활발하고 호기심 많은 모험가 소년',
      promptKeywords: ['Pixar 3D animation style', 'Disney 3D rendering', 'bright colors', 'soft lighting', 'expressive eyes', 'round features'],
    },
  },
  {
    id: 'watercolor-fantasy-witch',
    label: '수채 판타지 · 마법사 소녀',
    thumbnailUrl: '/archetypes/watercolor-fantasy-witch.svg',
    preset: {
      visualStyle: 'watercolor-fantasy',
      visualDescription: 'Magical girl character with flowing hair, mystical aura, soft watercolor textures and ethereal atmosphere',
      colorSuggestions: ['#7B68EE', '#DDA0DD', '#87CEEB', '#F0E68C'],
      personalityHint: '신비롭고 다정한 마법의 수호자',
      promptKeywords: ['Studio Ghibli watercolor', 'Hayao Miyazaki style', 'ethereal atmosphere', 'magical glow', 'soft brush strokes'],
    },
  },
  {
    id: 'round-mascot-animal',
    label: '라운드 마스코트 · 동물 캐릭터',
    thumbnailUrl: '/archetypes/round-mascot-animal.svg',
    preset: {
      visualStyle: 'round-mascot',
      visualDescription: 'Adorable round animal mascot with simple features, pastel colors, minimal details, kawaii proportions',
      colorSuggestions: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA'],
      personalityHint: '사랑스럽고 장난기 가득한 마스코트',
      promptKeywords: ['Sanrio style', 'LINE Friends character', 'Kakao Friends style', 'kawaii mascot', 'round proportions', 'pastel colors'],
    },
  },
  {
    id: 'dark-mood-mystery',
    label: '다크 무드 · 미스터리 남자',
    thumbnailUrl: '/archetypes/dark-mood-mystery.svg',
    preset: {
      visualStyle: 'dark-mood',
      visualDescription: 'Mysterious male character with sharp features, dramatic lighting, dark clothing, intense gaze',
      colorSuggestions: ['#2C003E', '#FF0055', '#1A1A2E', '#E94560'],
      personalityHint: '카리스마 넘치는 미스터리한 인물',
      promptKeywords: ['Persona 5 art style', 'Arcane Netflix aesthetic', 'dramatic noir lighting', 'sharp angular features', 'high contrast'],
    },
  },
  {
    id: 'mini-fairy',
    label: '미니 캐릭터 · 귀여운 요정',
    thumbnailUrl: '/archetypes/mini-fairy.svg',
    preset: {
      visualStyle: 'mini-chibi',
      visualDescription: 'Tiny fairy character with oversized head, sparkly wings, cute chibi proportions, glowing particles',
      colorSuggestions: ['#FF69B4', '#00CED1', '#FFD700', '#98FB98'],
      personalityHint: '장난꾸러기지만 순수한 요정',
      promptKeywords: ['chibi anime style', 'Genshin Impact character design', 'super deformed proportions', 'sparkle effects', 'cute fantasy'],
    },
  },
  {
    id: 'webtoon-hip-teen',
    label: '한국 웹툰 · 힙한 10대',
    thumbnailUrl: '/archetypes/webtoon-hip-teen.svg',
    preset: {
      visualStyle: 'webtoon-modern',
      visualDescription: 'Stylish Korean teen character with trendy outfit, clean line art, modern webtoon aesthetic, expressive face',
      colorSuggestions: ['#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9'],
      personalityHint: '트렌디하고 자신감 넘치는 10대',
      promptKeywords: ['Korean webtoon style', 'True Beauty manhwa', 'Naver Webtoon aesthetic', 'clean line art', 'modern fashion', 'expressive eyes'],
    },
  },
  {
    id: 'watercolor-emotional-girl',
    label: '감성 수채화 · 소녀',
    thumbnailUrl: '/archetypes/watercolor-emotional-girl.svg',
    preset: {
      visualStyle: 'watercolor-emotional',
      visualDescription: 'Dreamy girl character with soft features, flowing hair, watercolor wash backgrounds, emotional lighting',
      colorSuggestions: ['#E6B0AA', '#AED6F1', '#F9E79F', '#D7BDE2'],
      personalityHint: '감성적이고 섬세한 소녀',
      promptKeywords: ['Makoto Shinkai art style', 'Your Name anime aesthetic', 'emotional watercolor', 'soft bokeh lighting', 'dreamy atmosphere'],
    },
  },
  {
    id: 'mecha-sf-ai',
    label: '메카 SF · AI 어시스턴트',
    thumbnailUrl: '/archetypes/mecha-sf-ai.svg',
    preset: {
      visualStyle: 'mecha-sf',
      visualDescription: 'Futuristic AI assistant character with sleek armor, holographic elements, neon accents, cyberpunk aesthetic',
      colorSuggestions: ['#00FFFF', '#0D0D0D', '#FF00FF', '#39FF14'],
      personalityHint: '논리적이지만 인간미 있는 AI',
      promptKeywords: ['Evangelion mecha design', 'Ghost in the Shell cyberpunk', 'cyberpunk neon aesthetic', 'holographic UI', 'futuristic armor'],
    },
  },
  {
    id: 'eastern-traditional-hanbok',
    label: '동양 전통 · 한복 캐릭터',
    thumbnailUrl: '/archetypes/eastern-traditional-hanbok.svg',
    preset: {
      visualStyle: 'eastern-traditional',
      visualDescription: 'Character in traditional Korean hanbok, elegant pose, traditional patterns, ink wash background elements',
      colorSuggestions: ['#C0392B', '#1E8449', '#F1C40F', '#2C3E50'],
      personalityHint: '우아하고 지혜로운 전통 캐릭터',
      promptKeywords: ['traditional Korean hanbok illustration', 'ukiyo-e inspired', 'ink wash painting', 'elegant traditional patterns', 'East Asian aesthetic'],
    },
  },
  {
    id: 'freetext',
    label: '직접 설명하기',
    thumbnailUrl: '',
    preset: {
      visualStyle: '',
      visualDescription: '',
      colorSuggestions: [],
      personalityHint: '',
      promptKeywords: [],
    },
  },
]

export function getArchetypeById(id: string): CharacterArchetype | undefined {
  return CHARACTER_ARCHETYPES.find((a) => a.id === id)
}
