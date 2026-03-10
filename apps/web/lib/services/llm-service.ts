/**
 * LLM Service
 *
 * Gemini API for story/script generation
 * Uses 6-Act Zootopia Protocol for narrative structure
 *
 * @see https://ai.google.dev/gemini-api/docs
 */

import type {
  KidsStory,
  KidsBasicStory,
  KidsAnimationStyle,
  KidsCharacter,
  ShotEmotion,
  ActKey,
} from '@vibe-media-lab/shared'
import {
  KIDS_ANIMATION_STYLES,
  KIDS_ZOOTOPIA_ACTS,
  KIDS_VOICE_PROFILES,
} from '@vibe-media-lab/shared'
import { callGeminiJSON } from './gemini-client'

// Re-export ActKey for route.ts
export type { ActKey }

const IS_MOCK = !process.env.GEMINI_API_KEY

// ============================================================
// Types
// ============================================================

export interface StoryGenerationParams {
  topic: string
  style: KidsAnimationStyle
}

export interface ScriptGenerationParams {
  story: KidsStory | KidsBasicStory
  style: KidsAnimationStyle
  maxShots: number
}

export interface GeneratedScript {
  totalDuration: number
  shotCount: number
  shots: Array<{
    id: string
    shotNumber: number
    duration: 5 | 10
    narration: string
    visualPrompt: string
    // Enhanced fields (Zootopia Protocol)
    actKey?: ActKey
    actTitle?: string
    emotion?: ShotEmotion
    voiceId?: string
    speechStyle?: string
    speaker?: string
    cameraMovement?: 'static' | 'pan' | 'zoom-in' | 'zoom-out' | 'tracking'
    characters?: string[]
    location?: string
  }>
  bgmPrompt: string
}

// ============================================================
// Story Generation (6-Act Zootopia Protocol)
// ============================================================

const ZOOTOPIA_PROTOCOL_PROMPT = `
## 6-Act Zootopia Narrative Protocol

당신은 "Zootopia"의 서사 구조를 기반으로 아동용 애니메이션 스토리를 설계합니다.
이 프로토콜은 Pixar/Disney 애니메이션의 검증된 스토리텔링 기법을 따릅니다.

### Act 구조:

1. **HOOK (도입)** - "꿈을 가진 주인공"
   - 주인공의 열망과 세계관 소개
   - 주인공이 가진 핸디캡이나 편견 암시
   - 감정: hopeful, curious, excited
   - 카메라: wide establishing shot

2. **DUO (만남)** - "운명적 파트너"
   - 정반대 성격의 파트너 등장
   - 처음엔 마찰, 점차 협력
   - 감정: surprised, suspicious, intrigued
   - 카메라: medium shot, two-shot

3. **JOURNEY (여정)** - "함께하는 모험"
   - 두 캐릭터가 함께 문제 해결
   - 서로의 장점 발견
   - 감정: determined, adventurous, learning
   - 카메라: tracking shot, dynamic angles

4. **TWIST (반전)** - "예상치 못한 위기"
   - 신뢰가 깨지거나 큰 장애물
   - **반전 악당의 정체가 드러나는 순간**
   - 감정: shocked, sad, confused
   - 카메라: close-up on reactions

5. **ACTION (결전)** - "극복의 순간"
   - 파트너와 화해하고 협력
   - 악당/문제에 맞서 싸움
   - 감정: brave, heroic, united
   - 카메라: dynamic action shots, low angle hero shots

6. **RESOLUTION (해결)** - "교훈과 성장"
   - 문제 해결, 성장한 주인공
   - 명확한 교훈 전달
   - 감정: joyful, proud, grateful
   - 카메라: wide shot, warm lighting

### 캐릭터 설계 원칙:

**Protagonist A (주인공 - 열정파)**
- goal: 명확한 꿈이나 목표 (예: "최고의 요리사가 되고 싶다")
- flaw: 극복해야 할 내면의 문제 (예: "성급함, 남의 말을 안 듣는다")
- 성장: 여정을 통해 flaw를 극복

**Protagonist B (파트너 - 신중파)**
- goal: 주인공과 다른 관점의 목표
- flaw: 주인공을 보완하면서도 자신만의 약점
- 티격태격하다 팀이 됨

**Villain (반전 악당) - 필수**
- **처음에는 친절한 조력자로 등장** (예: 친절한 이웃, 도움을 주는 선배)
- **TWIST에서 진짜 정체 드러남** (예: 사실은 자기 이익을 위해 도움을 가장한 것)
- goal: 숨겨진 목적 (예: "자신만의 이익 추구", "주인공의 성공을 가로채려 함")
- flaw: 악당의 약점 (결말에서 패인이 됨)
- 아이들에게 무섭지 않게, 교훈적으로 표현

### 비주얼 프롬프트 원칙:
- 캐릭터의 종(species)과 외형을 일관되게 유지
- 감정을 표정과 포즈로 표현
- 배경은 세계관에 맞게 통일
- **각 Act마다 적절한 카메라 앵글 명시** (wide shot, close-up, medium shot, tracking shot 등)

### 유머 원칙 (부모도 함께 웃을 수 있게):
- 시각적 유머 (slapstick, 과장된 표정)
- 언어유희 (말장난, 재치 있는 대사)
- 상황 코미디 (아이러니, 예상치 못한 전개)
`

export async function generateStory(
  params: StoryGenerationParams
): Promise<KidsStory> {
  if (IS_MOCK) {
    return mockGenerateStory(params)
  }

  const styleConfig = KIDS_ANIMATION_STYLES[params.style]

  const prompt = `
${ZOOTOPIA_PROTOCOL_PROMPT}

## 현재 과제

주제: ${params.topic}
스타일: ${params.style} (${styleConfig.description})

위의 6-Act Zootopia Protocol에 따라 **5-12세 아이들과 부모가 함께 즐길 수 있는** 교육적 애니메이션 스토리를 작성해주세요.

## 출력 형식 (JSON)

{
  "title": "한글 제목 (매력적이고 기억하기 쉬운)",
  "logline": "한 문장으로 스토리 핵심 요약 (예: 용기 없는 토끼가 의심 많은 여우와 함께 진정한 우정을 찾아가는 이야기)",
  "lesson": "핵심 교훈 (한 문장)",
  "synopsis": "3-4문장 줄거리 요약",
  "characters": [
    {
      "name": "캐릭터 이름 (한글)",
      "role": "protagonist_a",
      "species": "동물/캐릭터 종류 (영어, 예: bunny, bear, fox)",
      "personality": "성격 키워드 (영어, 예: eager, curious, shy)",
      "visualDescription": "영어 비주얼 묘사 (이미지 생성용, 예: A small white bunny with big curious eyes, wearing a red backpack)",
      "goal": "캐릭터의 꿈/목표 (한글, 예: 최고의 요리사가 되고 싶다)",
      "flaw": "극복해야 할 약점 (한글, 예: 성급함, 남의 말을 안 듣는다)"
    },
    {
      "name": "파트너 이름",
      "role": "protagonist_b",
      "species": "종류",
      "personality": "성격 (protagonist_a와 대조적으로)",
      "visualDescription": "영어 비주얼 묘사",
      "goal": "파트너의 목표 (주인공과 다른 관점)",
      "flaw": "파트너의 약점"
    },
    {
      "name": "반전 악당 이름",
      "role": "villain",
      "species": "종류",
      "personality": "겉으로는 친절해 보이는 성격 (영어)",
      "visualDescription": "영어 비주얼 묘사 (처음에는 친절해 보이는 외모)",
      "goal": "숨겨진 목적 (한글)",
      "flaw": "악당의 약점 (결말에서 패인이 됨)"
    }
  ],
  "plot": {
    "hook": {
      "title": "Act 제목 (한글)",
      "narration": "나레이션 텍스트 (한글, 아이 친화적, 2-3문장)",
      "visualPrompt": "영어 비주얼 프롬프트 (${styleConfig.visualPromptSuffix} 스타일)",
      "emotion": "hopeful",
      "cameraAngle": "wide establishing shot"
    },
    "duo": {
      "title": "만남",
      "narration": "나레이션 (한글, 2-3문장, villain이 친절한 조력자로 등장)",
      "visualPrompt": "영어 장면 묘사",
      "emotion": "surprised",
      "cameraAngle": "medium two-shot"
    },
    "journey": {
      "title": "여정",
      "narration": "나레이션 (한글, 2-3문장)",
      "visualPrompt": "영어 장면 묘사",
      "emotion": "adventurous",
      "cameraAngle": "tracking shot"
    },
    "twist": {
      "title": "반전",
      "narration": "나레이션 (한글, 2-3문장, villain의 진짜 정체가 드러남)",
      "visualPrompt": "영어 장면 묘사 (villain의 정체 드러나는 장면)",
      "emotion": "shocked",
      "cameraAngle": "close-up on reactions"
    },
    "action": {
      "title": "극복",
      "narration": "나레이션 (한글, 2-3문장)",
      "visualPrompt": "영어 장면 묘사",
      "emotion": "brave",
      "cameraAngle": "dynamic low angle hero shot"
    },
    "resolution": {
      "title": "해결",
      "narration": "나레이션 (한글, 2-3문장)",
      "visualPrompt": "영어 장면 묘사",
      "emotion": "joyful",
      "cameraAngle": "wide shot with warm lighting"
    }
  },
  "setting": {
    "world": "세계관 설명 (한글)",
    "mainLocations": ["장소1 (한글)", "장소2 (한글)", "장소3 (한글)"],
    "locationVisualDescriptions": ["English visual description of location 1", "English visual description of location 2", "English visual description of location 3"],
    "atmosphere": "분위기 (한글)"
  },
  "bgmDirection": "영어로 BGM 방향 설명. 반드시 'Keep it short, around 1 minute (70 seconds)' 포함. 예: Orchestral with playful woodwinds, building to heroic brass in climax. Keep it short, around 1 minute (70 seconds). Do not exceed 80 seconds."
}

## 필수 규칙
- characters에 반드시 3명 포함: protagonist_a, protagonist_b, villain
- 두 주인공은 성격이 대조적이어야 함 (Judy & Nick처럼)
- **villain은 처음에 친절한 조력자로 등장**, TWIST에서 정체 드러남
- visualDescription은 영어로, 캐릭터 외형 상세 묘사
- narration은 한글로, 5-12세가 이해할 수 있게
- visualPrompt는 영어로, ${styleConfig.visualPromptSuffix} 스타일 반영
- **visualPrompt에 cameraAngle 정보 포함** (wide shot, close-up, medium shot 등)
- locationVisualDescriptions는 영어로, 각 장소의 상세한 시각적 묘사 (캐릭터 제외, 배경만)
- **어른도 웃을 수 있는 시각적 유머/언어유희 1개 이상 포함**
- 폭력적이거나 무서운 내용 절대 금지`

  return callGeminiJSON<KidsStory>(prompt)
}

async function mockGenerateStory(
  params: StoryGenerationParams
): Promise<KidsStory> {
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const [mainTopic, setting] = params.topic.split(',').map((s) => s.trim())
  const topic = mainTopic || params.topic
  const world = setting || '마법의 숲'
  const styleConfig = KIDS_ANIMATION_STYLES[params.style]

  return {
    title: `${topic}의 대모험`,
    logline: `용기 없는 토끼 꼬미가 신중한 곰 버블과 함께 가짜 친구의 정체를 밝히고 진정한 우정을 찾아가는 이야기`,
    lesson: `${topic}의 중요성과 친구와 함께하는 것의 소중함을 배우는 이야기`,
    synopsis: `${world}에서 펼쳐지는 ${topic}에 관한 교훈적인 모험. 꼬미와 버블이 친절해 보이던 슬릭의 정체를 밝히고, 함께 위기를 극복하며 성장하는 이야기입니다.`,
    characters: [
      {
        name: '꼬미',
        role: 'protagonist_a' as const,
        species: 'bunny',
        personality: 'curious, eager, sometimes impatient',
        visualDescription: `A small white bunny with big curious pink eyes, wearing a red backpack and blue scarf. ${styleConfig.visualPromptSuffix}`,
        goal: '용감한 모험가가 되어 마법의 숲을 탐험하고 싶다',
        flaw: '성급하고 다른 사람의 조언을 잘 듣지 않는다',
        voiceId: KIDS_VOICE_PROFILES.child_protagonist.voiceId,
        speakingStyle: KIDS_VOICE_PROFILES.child_protagonist.style,
      },
      {
        name: '버블',
        role: 'protagonist_b' as const,
        species: 'bear',
        personality: 'calm, wise, cautious',
        visualDescription: `A gentle brown bear cub with warm amber eyes, wearing a green vest with acorn buttons. ${styleConfig.visualPromptSuffix}`,
        goal: '친구들을 안전하게 지키면서 함께 즐거운 추억을 만들고 싶다',
        flaw: '너무 조심스러워서 새로운 시도를 두려워한다',
        voiceId: KIDS_VOICE_PROFILES.friendly_sidekick.voiceId,
        speakingStyle: KIDS_VOICE_PROFILES.friendly_sidekick.style,
      },
      {
        name: '슬릭',
        role: 'villain' as const,
        species: 'fox',
        personality: 'charming, smooth-talking, secretly manipulative',
        visualDescription: `A sleek orange fox with a friendly smile and sparkling green eyes, wearing a fancy purple bow tie. Appears trustworthy and helpful at first. ${styleConfig.visualPromptSuffix}`,
        goal: '꼬미와 버블의 모험을 이용해 마법의 보물을 혼자 차지하려 한다',
        flaw: '자만심이 너무 강해서 작은 것들을 무시한다',
        voiceId: KIDS_VOICE_PROFILES.narrator.voiceId,
        speakingStyle: 'smooth and persuasive',
      },
    ],
    plot: {
      hook: {
        title: '꼬미의 꿈',
        summary: `꼬미는 ${topic}을(를) 싫어하는 토끼였어요. 하지만 마음 한편엔 용감해지고 싶은 꿈이 있었죠.`,
        narration: `옛날 옛적, ${world}에 꼬미라는 작은 토끼가 살았어요. 꼬미는 ${topic}을(를) 정말 싫어했지만, 언젠가 용감한 모험가가 되고 싶은 꿈이 있었답니다.`,
        visualPrompt: `Wide establishing shot: A small white bunny with curious eyes standing at the edge of a magical forest, looking at a distant mountain with determination. Soft morning light, ${styleConfig.visualPromptSuffix}`,
        emotion: 'hopeful' as const,
        cameraAngle: 'wide establishing shot',
      },
      duo: {
        title: '수상한 도우미',
        summary: `숲에서 길을 잃은 꼬미가 곰돌이 버블을 만나요. 그때 친절한 여우 슬릭이 나타나 도움을 제안해요.`,
        narration: `어느 날, 꼬미가 숲에서 길을 잃었을 때, 버블이라는 곰돌이를 만났어요. 그때 멋진 나비넥타이를 한 여우 슬릭이 나타났어요. "안녕? 내가 지름길을 알려줄게!" 슬릭은 정말 친절해 보였어요.`,
        visualPrompt: `Medium two-shot: A small white bunny and brown bear cub meeting a charming orange fox with purple bow tie in a sunlit forest clearing. The fox smiles warmly. ${styleConfig.visualPromptSuffix}`,
        emotion: 'surprised' as const,
        cameraAngle: 'medium two-shot',
      },
      journey: {
        title: '함께하는 모험',
        summary: `꼬미, 버블, 슬릭이 함께 ${topic}에 대해 배우며 모험을 떠나요. 하지만 버블은 뭔가 이상함을 느껴요.`,
        narration: `셋은 함께 모험을 떠났어요. 슬릭은 ${topic}의 비밀을 알려줬고, 꼬미는 신나했어요. 하지만 버블은 "뭔가 이상해..."라고 작게 중얼거렸답니다.`,
        visualPrompt: `Tracking shot: A bunny, bear cub, and fox walking together through a colorful magical path. The fox leads confidently while the bear looks slightly suspicious. ${styleConfig.visualPromptSuffix}`,
        emotion: 'adventurous' as const,
        cameraAngle: 'tracking shot',
      },
      twist: {
        title: '드러난 정체',
        summary: `슬릭의 진짜 목적이 드러나요! 슬릭은 마법의 보물을 혼자 차지하려 했던 거예요.`,
        narration: `그때였어요! 슬릭이 갑자기 웃으며 말했어요. "고마워, 바보들아! 이 보물은 내 거야!" 알고 보니 슬릭은 처음부터 꼬미와 버블을 이용하려 했던 거예요. 꼬미는 충격을 받았어요.`,
        visualPrompt: `Close-up on reactions: The fox reveals his true scheming nature, reaching for a glowing treasure. The bunny looks shocked, the bear shows an 'I knew it' expression. Dramatic lighting, ${styleConfig.visualPromptSuffix}`,
        emotion: 'shocked' as const,
        cameraAngle: 'close-up on reactions',
      },
      action: {
        title: '용기를 내요',
        summary: `꼬미가 버블의 조언을 듣고, 함께 슬릭의 계획을 막아요.`,
        narration: `"버블, 네 말이 맞았어! 이제 어떡해?" 버블이 웃으며 말했어요. "괜찮아, 우리 함께라면!" 두 친구는 힘을 합쳐 슬릭의 자만심을 이용했어요. 슬릭은 작은 도토리에 발이 걸려 넘어졌답니다!`,
        visualPrompt: `Dynamic low angle hero shot: A brave bunny and bear cub standing together confidently. The fox trips over an acorn in the background. Heroic moment with golden light, ${styleConfig.visualPromptSuffix}`,
        emotion: 'brave' as const,
        cameraAngle: 'dynamic low angle hero shot',
      },
      resolution: {
        title: '새로운 시작',
        summary: `꼬미는 ${topic}을(를) 좋아하게 되었고, 버블의 조언을 듣는 법도 배웠어요.`,
        narration: `이제 꼬미는 ${topic}을(를) 정말 좋아하게 되었어요. 그리고 친구의 말에 귀 기울이는 것이 얼마나 중요한지도 배웠답니다. "버블, 고마워! 앞으로는 네 말 잘 들을게!" 행복한 끝!`,
        visualPrompt: `Wide shot with warm lighting: A bunny and bear cub hugging happily in a beautiful sunset meadow, surrounded by flowers. The fox is seen walking away dejected in the distance. Joyful ending scene, ${styleConfig.visualPromptSuffix}`,
        emotion: 'joyful' as const,
        cameraAngle: 'wide shot with warm lighting',
      },
    },
    setting: {
      world: `${world} - 다양한 동물 친구들이 사는 아름다운 세계`,
      mainLocations: [`${world} 입구`, '무지개 오솔길', '별빛 호수'],
      locationVisualDescriptions: [
        `A grand magical entrance gate to ${world}, ornate arch with glowing crystals, lush vegetation, warm golden sunlight, fantasy forest setting`,
        'A winding rainbow-colored path through an enchanted forest, sparkling particles in the air, colorful flowers along the sides, dappled sunlight through tree canopy',
        'A serene magical lake reflecting starlight, bioluminescent plants around the shore, crystal clear water with soft glow, peaceful twilight atmosphere',
      ],
      atmosphere: '밝고 따뜻하며, 모험과 우정이 넘치는 분위기',
    },
    bgmDirection: `Orchestral children's animation music with playful woodwinds and gentle strings. Start with hopeful, curious melody (piano and flute). Build to adventurous theme with added percussion. Dramatic tension during twist with minor key shift. Triumphant brass fanfare for action scene. Resolve with warm, heartfelt strings and gentle piano for happy ending. Style: ${styleConfig.description}, suitable for ages 5-12. Keep it short, around 1 minute (70 seconds). Do not exceed 80 seconds.`,
  }
}

// ============================================================
// Script Generation (Enhanced with Emotion & Voice)
// ============================================================

// 스토리가 새로운 형식인지 확인하는 타입 가드
function isEnhancedStory(story: KidsStory | KidsBasicStory): story is KidsStory {
  return 'characters' in story && Array.isArray(story.characters)
}

// 캐릭터 정보를 프롬프트 문자열로 변환
function formatCharactersForPrompt(characters: KidsCharacter[]): string {
  return characters
    .map(
      (c) =>
        `- ${c.name} (${c.role}): ${c.species}, ${c.personality}\n  Visual: ${c.visualDescription}`
    )
    .join('\n')
}

// 플롯 정보를 프롬프트 문자열로 변환
function formatPlotForPrompt(
  plot: KidsStory['plot'] | KidsBasicStory['plot']
): string {
  if ('hook' in plot) {
    // Enhanced Zootopia format
    return Object.entries(plot)
      .map(
        ([key, act]) =>
          `- ${key.toUpperCase()}: ${act.title}\n  ${act.narration}\n  Emotion: ${act.emotion}`
      )
      .join('\n')
  }
  // Legacy format
  return Object.entries(plot)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n')
}

export async function generateScript(
  params: ScriptGenerationParams
): Promise<GeneratedScript> {
  if (IS_MOCK) {
    return mockGenerateScript(params)
  }

  const styleConfig = KIDS_ANIMATION_STYLES[params.style]
  const story = params.story

  // 캐릭터 정보 (있으면 사용)
  const charactersInfo = isEnhancedStory(story)
    ? `\n## 캐릭터:\n${formatCharactersForPrompt(story.characters)}`
    : ''

  // 캐릭터 이름 목록 (정확한 매칭을 위해)
  const characterNames = isEnhancedStory(story)
    ? story.characters.map(c => c.name)
    : []
  const characterNamesList = characterNames.length > 0
    ? `\n사용 가능한 캐릭터 이름: ${characterNames.map(n => `"${n}"`).join(', ')}`
    : ''

  // 장소 목록
  const locationNames = isEnhancedStory(story) && story.setting?.mainLocations
    ? story.setting.mainLocations
    : []
  const locationNamesList = locationNames.length > 0
    ? `\n사용 가능한 장소: ${locationNames.map(n => `"${n}"`).join(', ')}`
    : ''

  // 플롯 정보
  const plotInfo = formatPlotForPrompt(story.plot)

  const prompt = `
당신은 아동용 애니메이션 스크립트 작성 전문가입니다.
다음 스토리를 기반으로 ${params.maxShots}개의 샷으로 구성된 스크립트를 작성해주세요.

## 스토리:
- 제목: ${story.title}
- 교훈: ${story.lesson}
- 줄거리: ${story.synopsis}
${charactersInfo}

## 플롯:
${plotInfo}

## 스타일: ${params.style} - ${styleConfig.description}
${characterNamesList}
${locationNamesList}

## 출력 형식 (JSON)

\`\`\`json
{
  "totalDuration": 총_재생시간_초,
  "shotCount": ${params.maxShots},
  "shots": [
    {
      "id": "shot-1",
      "shotNumber": 1,
      "duration": 10,
      "narration": "나레이션 텍스트 (한국어, 25자 이내)",
      "visualPrompt": "영어 비주얼 프롬프트 (캐릭터 외형 일관성 유지)",
      "actKey": "hook",
      "actTitle": "Act 제목 (한글)",
      "emotion": "hopeful",
      "voiceId": "Rachel",
      "speechStyle": "warm storytelling tone",
      "speaker": "narrator",
      "cameraMovement": "static",
      "characters": ["캐릭터1"],
      "location": "장소명"
    }
  ],
  "bgmPrompt": "전체 영상에 어울리는 BGM 영어 프롬프트"
}
\`\`\`

## 규칙:
1. **duration**: 모든 샷 10초 고정

2. **visualPrompt** (영어):
   - ${styleConfig.visualPromptSuffix} 스타일 반영
   - 캐릭터 외형을 일관되게 묘사 (species, 의상, 색상)
   - 감정을 표정과 포즈로 표현

3. **emotion**: 다음 중 선택
   - hook: hopeful, curious, excited, peaceful
   - duo: surprised, suspicious, intrigued, friendly
   - journey: determined, adventurous, struggling, learning
   - twist: shocked, sad, confused
   - action: brave, intense, heroic, united
   - resolution: joyful, proud, grateful

4. **speaker**: "narrator" 또는 캐릭터 이름

5. **speechStyle**: 감정에 맞는 말투
   - 예: "warm and gentle", "excited and fast", "soft and sad"

6. **cameraMovement**: static, pan, zoom-in, zoom-out, tracking

7. **narration**: 한국어, 3-7세가 이해할 수 있게, **반드시 40-50자** (동화책 읽어주듯 천천히 10초 분량)

8. **characters**: 이 샷에 등장하는 캐릭터 이름 배열 (위의 캐릭터 이름 목록에서 정확히 선택)
   - 캐릭터 없는 순수 배경 샷은 빈 배열 []
   - speaker가 캐릭터인 경우 반드시 포함

9. **location**: 이 샷의 배경 장소 (위의 장소 목록에서 정확히 하나 선택)

10. **bgmPrompt**: 영어, 아동용 애니메이션 BGM 프롬프트
   - 필수 포함: 장르/분위기, 스토리 감정 흐름 (hopeful→surprised→adventurous→sad→brave→joyful)
   - **필수**: "Keep it short, around 1 minute (70 seconds). Do not exceed 80 seconds." 문구 포함
   - 조건: instrumental only, 3-7세 적합, ${styleConfig.description} 스타일
   - 스토리의 핵심 테마와 감정 변화를 음악으로 표현
   - 예: "Cheerful orchestral music with gentle piano intro, building to adventurous strings, triumphant brass finale. Keep it short, around 1 minute (70 seconds)."
`

  return callGeminiJSON<GeneratedScript>(prompt)
}

async function mockGenerateScript(
  params: ScriptGenerationParams
): Promise<GeneratedScript> {
  await new Promise((resolve) => setTimeout(resolve, 2500))

  const { story, style, maxShots } = params
  const styleConfig = KIDS_ANIMATION_STYLES[style]

  // 6-Act Zootopia Protocol 기반 샷 매핑
  const actKeys: ActKey[] = ['hook', 'duo', 'journey', 'twist', 'action', 'resolution']

  const emotionMap: Record<ActKey, ShotEmotion> = {
    hook: 'hopeful',
    duo: 'surprised',
    journey: 'adventurous',
    twist: 'sad',
    action: 'brave',
    resolution: 'joyful',
  }

  const speechStyleMap: Record<ShotEmotion, string> = {
    hopeful: 'warm and gentle, full of anticipation',
    curious: 'inquisitive and light',
    excited: 'energetic and fast-paced',
    peaceful: 'soft and calm',
    surprised: 'startled but friendly',
    suspicious: 'cautious and measured',
    intrigued: 'interested and engaged',
    friendly: 'warm and welcoming',
    determined: 'strong and focused',
    adventurous: 'bold and enthusiastic',
    struggling: 'effortful but persistent',
    learning: 'thoughtful and growing',
    shocked: 'sudden and impactful',
    betrayed: 'hurt and confused',
    sad: 'soft and melancholic',
    confused: 'uncertain and questioning',
    brave: 'confident and heroic',
    intense: 'dramatic and powerful',
    heroic: 'triumphant and bold',
    united: 'harmonious and strong',
    joyful: 'bright and celebratory',
    proud: 'warm and accomplished',
    grateful: 'sincere and heartfelt',
    neutral: 'calm and steady',
  }

  const cameraMovements: Array<'static' | 'pan' | 'zoom-in' | 'zoom-out' | 'tracking'> =
    ['static', 'pan', 'zoom-in', 'static', 'tracking', 'zoom-out']

  // Enhanced story 형식인지 확인
  const isEnhanced = isEnhancedStory(story)
  const characters = isEnhanced ? story.characters : []
  const _protagonist = characters.find((c) => c.role === 'protagonist_a')
  const _partner = characters.find((c) => c.role === 'protagonist_b')

  const shots = Array.from({ length: maxShots }, (_, i) => {
    const actIndex = Math.floor((i / maxShots) * actKeys.length)
    const safeIndex = Math.min(actIndex, actKeys.length - 1)
    const actKey = actKeys[safeIndex] ?? 'hook'
    const actInfo = KIDS_ZOOTOPIA_ACTS[actKey]
    const emotion = emotionMap[actKey]

    // 플롯에서 해당 Act 정보 가져오기
    let narration: string
    let visualPrompt: string
    let actTitle: string

    if (isEnhanced && 'hook' in story.plot) {
      const enhancedPlot = story.plot
      const actPlot = enhancedPlot[actKey]
      narration = actPlot.narration
      visualPrompt = actPlot.visualPrompt
      actTitle = actPlot.title
    } else if (!('hook' in story.plot)) {
      // Legacy format fallback
      const legacyPlot = story.plot
      const legacyKeys: (keyof typeof legacyPlot)[] = [
        'opening',
        'incitingIncident',
        'risingAction',
        'climax',
        'fallingAction',
        'resolution',
      ]
      const legacyKey = legacyKeys[safeIndex] ?? 'opening'
      narration = legacyPlot[legacyKey] || ''
      actTitle = actInfo.label
      visualPrompt = `${styleConfig.visualPromptSuffix}. Scene ${i + 1}: ${actInfo.label}. Characters in a magical world.`
    } else {
      narration = ''
      actTitle = actInfo.label
      visualPrompt = `${styleConfig.visualPromptSuffix}. Scene ${i + 1}: ${actInfo.label}. Characters in a magical world.`
    }

    return {
      id: `shot-${i + 1}`,
      shotNumber: i + 1,
      duration: 10 as const,
      narration,
      visualPrompt,
      actKey,
      actTitle,
      emotion,
      voiceId: KIDS_VOICE_PROFILES.narrator.voiceId,
      speechStyle: speechStyleMap[emotion],
      speaker: 'narrator' as const,
      cameraMovement: cameraMovements[safeIndex] ?? 'static',
      characters: characters.slice(0, Math.min(2, characters.length)).map(c => c.name),
      location: isEnhanced && story.setting?.mainLocations?.[safeIndex % (story.setting.mainLocations.length || 1)]
        ? story.setting.mainLocations[safeIndex % story.setting.mainLocations.length]
        : undefined,
    }
  })

  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0)

  const bgmPrompt = `Cheerful, uplifting orchestral music for a children's animation. ${style} style, ${styleConfig.description} atmosphere. Magical adventure theme with emotional peaks matching the 6-act story structure. Instrumental only, suitable for kids aged 3-7. Start gentle and hopeful, build through adventure, crescendo at action scene, resolve warmly. Keep it short, around 1 minute (${totalDuration} seconds). Do not exceed ${totalDuration + 10} seconds.`

  return {
    totalDuration,
    shotCount: shots.length,
    shots,
    bgmPrompt,
  }
}

// ============================================================
// Utility
// ============================================================

export function isLLMServiceAvailable(): boolean {
  return !IS_MOCK
}

export function getLLMServiceProvider(): 'gemini' | 'mock' {
  if (!IS_MOCK) return 'gemini'
  return 'mock'
}
