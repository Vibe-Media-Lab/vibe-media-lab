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

// Re-export ActKey for route.ts
export type { ActKey }

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const IS_MOCK = !GEMINI_API_KEY

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// ============================================================
// Types
// ============================================================

export interface StoryGenerationParams {
  topic: string
  style: KidsAnimationStyle
  quality: 'draft' | 'standard' | 'premium'
}

export interface ScriptGenerationParams {
  story: KidsStory | KidsBasicStory
  style: KidsAnimationStyle
  quality: 'draft' | 'standard' | 'premium'
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
  }>
  bgmPrompt: string
}

// ============================================================
// Gemini API Client
// ============================================================

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Gemini API error response:', errorBody)
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorBody}`)
  }

  const data = await response.json()

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    console.error('No text in Gemini response. Full data:', JSON.stringify(data))
    throw new Error('No response from Gemini')
  }

  return text
}

function extractJSON<T>(text: string): T {
  // Try to extract JSON from markdown code blocks or raw text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = (jsonMatch?.[1] ?? text).trim()

  // Find the first { and last }
  const start = jsonStr.indexOf('{')
  const end = jsonStr.lastIndexOf('}')

  if (start === -1 || end === -1) {
    console.error('No JSON found. Full response:', text)
    throw new Error(`No JSON found in response. Response starts with: ${text.slice(0, 200)}`)
  }

  try {
    return JSON.parse(jsonStr.slice(start, end + 1))
  } catch (parseError) {
    console.error('JSON parse error:', parseError)
    console.error('Attempted to parse:', jsonStr.slice(start, end + 1).slice(0, 500))
    throw new Error(`Failed to parse JSON: ${parseError}`)
  }
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

2. **DUO (만남)** - "운명적 파트너"
   - 정반대 성격의 파트너 등장
   - 처음엔 마찰, 점차 협력
   - 감정: surprised, suspicious, intrigued

3. **JOURNEY (여정)** - "함께하는 모험"
   - 두 캐릭터가 함께 문제 해결
   - 서로의 장점 발견
   - 감정: determined, adventurous, learning

4. **TWIST (반전)** - "예상치 못한 위기"
   - 신뢰가 깨지거나 큰 장애물
   - 주인공의 내면 갈등
   - 감정: shocked, sad, confused

5. **ACTION (결전)** - "극복의 순간"
   - 파트너와 화해하고 협력
   - 악당/문제에 맞서 싸움
   - 감정: brave, heroic, united

6. **RESOLUTION (해결)** - "교훈과 성장"
   - 문제 해결, 성장한 주인공
   - 명확한 교훈 전달
   - 감정: joyful, proud, grateful

### 캐릭터 설계 원칙:

**Protagonist A (주인공)**
- 열망: 명확한 꿈이나 목표
- 약점: 극복해야 할 내면의 문제
- 성장: 여정을 통해 배우는 것

**Protagonist B (파트너)**
- 주인공과 대조되는 성격
- 주인공에게 없는 능력/관점 보유
- 함께하며 서로 성장

**Villain/Obstacle (적대자)**
- 반드시 "나쁜 놈"일 필요 없음
- 주인공의 성장을 촉진하는 역할
- 아이들에게 무섭지 않게

### 비주얼 프롬프트 원칙:
- 캐릭터의 종(species)과 외형을 일관되게 유지
- 감정을 표정과 포즈로 표현
- 배경은 세계관에 맞게 통일
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
품질: ${params.quality}

위의 6-Act Zootopia Protocol에 따라 3-7세 아이들을 위한 교육적 애니메이션 스토리를 작성해주세요.

## 출력 형식 (JSON)

{
  "title": "한글 제목 (매력적이고 기억하기 쉬운)",
  "lesson": "핵심 교훈 (한 문장)",
  "synopsis": "3-4문장 줄거리 요약",
  "characters": [
    {
      "name": "캐릭터 이름 (한글)",
      "role": "protagonist_a",
      "species": "동물/캐릭터 종류 (영어, 예: bunny, bear, fox)",
      "personality": "성격 키워드 (영어, 예: eager, curious, shy)",
      "visualDescription": "영어 비주얼 묘사 (이미지 생성용, 예: A small white bunny with big curious eyes, wearing a red backpack)"
    },
    {
      "name": "파트너 이름",
      "role": "protagonist_b",
      "species": "종류",
      "personality": "성격 (protagonist_a와 대조적으로)",
      "visualDescription": "영어 비주얼 묘사"
    }
  ],
  "plot": {
    "hook": {
      "title": "Act 제목 (한글)",
      "narration": "나레이션 텍스트 (한글, 아이 친화적, 2-3문장)",
      "visualPrompt": "영어 비주얼 프롬프트 (${styleConfig.visualPromptSuffix} 스타일)",
      "emotion": "hopeful"
    },
    "duo": {
      "title": "만남",
      "narration": "나레이션 (한글, 2-3문장)",
      "visualPrompt": "영어 장면 묘사",
      "emotion": "surprised"
    },
    "journey": {
      "title": "여정",
      "narration": "나레이션 (한글, 2-3문장)",
      "visualPrompt": "영어 장면 묘사",
      "emotion": "excited"
    },
    "twist": {
      "title": "위기",
      "narration": "나레이션 (한글, 2-3문장)",
      "visualPrompt": "영어 장면 묘사",
      "emotion": "sad"
    },
    "action": {
      "title": "극복",
      "narration": "나레이션 (한글, 2-3문장)",
      "visualPrompt": "영어 장면 묘사",
      "emotion": "brave"
    },
    "resolution": {
      "title": "해결",
      "narration": "나레이션 (한글, 2-3문장)",
      "visualPrompt": "영어 장면 묘사",
      "emotion": "joyful"
    }
  },
  "setting": {
    "world": "세계관 설명 (한글)",
    "mainLocations": ["장소1 (한글)", "장소2 (한글)", "장소3 (한글)"],
    "locationVisualDescriptions": ["English visual description of location 1", "English visual description of location 2", "English visual description of location 3"],
    "atmosphere": "분위기 (한글)"
  }
}

## 필수 규칙
- characters에 반드시 2명 (protagonist_a, protagonist_b) 포함
- 두 캐릭터는 성격이 대조적이어야 함 (Judy & Nick처럼)
- visualDescription은 영어로, 캐릭터 외형 상세 묘사
- narration은 한글로, 3-7세가 이해할 수 있게
- visualPrompt는 영어로, ${styleConfig.visualPromptSuffix} 스타일 반영
- locationVisualDescriptions는 영어로, 각 장소의 상세한 시각적 묘사 (캐릭터 제외, 배경만)
- 폭력적이거나 무서운 내용 절대 금지`

  const response = await callGemini(prompt)
  return extractJSON<KidsStory>(response)
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
    lesson: `${topic}의 중요성과 친구와 함께하는 것의 소중함을 배우는 이야기`,
    synopsis: `${world}에서 펼쳐지는 ${topic}에 관한 교훈적인 모험. 꼬미와 버블이 함께 위기를 극복하고 성장하는 이야기입니다.`,
    characters: [
      {
        name: '꼬미',
        role: 'protagonist_a' as const,
        species: 'bunny',
        personality: 'curious, eager, sometimes impatient',
        visualDescription: `A small white bunny with big curious pink eyes, wearing a red backpack and blue scarf. ${styleConfig.visualPromptSuffix}`,
        voiceId: KIDS_VOICE_PROFILES.child_protagonist.voiceId,
        speakingStyle: KIDS_VOICE_PROFILES.child_protagonist.style,
      },
      {
        name: '버블',
        role: 'protagonist_b' as const,
        species: 'bear',
        personality: 'calm, wise, supportive',
        visualDescription: `A gentle brown bear cub with warm amber eyes, wearing a green vest with acorn buttons. ${styleConfig.visualPromptSuffix}`,
        voiceId: KIDS_VOICE_PROFILES.friendly_sidekick.voiceId,
        speakingStyle: KIDS_VOICE_PROFILES.friendly_sidekick.style,
      },
    ],
    plot: {
      hook: {
        title: '꼬미의 꿈',
        summary: `꼬미는 ${topic}을(를) 싫어하는 토끼였어요. 하지만 마음 한편엔 용감해지고 싶은 꿈이 있었죠.`,
        narration: `옛날 옛적, ${world}에 꼬미라는 작은 토끼가 살았어요. 꼬미는 ${topic}을(를) 정말 싫어했지만, 언젠가 용감한 모험가가 되고 싶은 꿈이 있었답니다.`,
        visualPrompt: `A small white bunny with curious eyes standing at the edge of a magical forest, looking at a distant mountain with determination. Soft morning light, ${styleConfig.visualPromptSuffix}`,
        emotion: 'hopeful' as const,
      },
      duo: {
        title: '버블과의 만남',
        summary: `숲에서 길을 잃은 꼬미가 곰돌이 버블을 만나요. 처음엔 서로 다른 점 때문에 어색했죠.`,
        narration: `어느 날, 꼬미가 숲에서 길을 잃었을 때, 버블이라는 곰돌이를 만났어요. "안녕? 난 버블이야!" 처음엔 서로 달라서 어색했지만, 함께 길을 찾기로 했어요.`,
        visualPrompt: `A small white bunny meeting a gentle brown bear cub in a sunlit forest clearing. They look at each other curiously. ${styleConfig.visualPromptSuffix}`,
        emotion: 'surprised' as const,
      },
      journey: {
        title: '함께하는 모험',
        summary: `꼬미와 버블이 함께 ${topic}에 대해 배우며 우정을 쌓아가요.`,
        narration: `꼬미와 버블은 함께 모험을 떠났어요. 버블은 ${topic}의 재미있는 비밀을 알려줬고, 꼬미는 처음으로 ${topic}이(가) 재밌다고 느꼈어요!`,
        visualPrompt: `A bunny and bear cub walking together through a colorful magical path, laughing and having fun. Adventure atmosphere, ${styleConfig.visualPromptSuffix}`,
        emotion: 'adventurous' as const,
      },
      twist: {
        title: '위기의 순간',
        summary: `갑자기 문제가 생겨서 두 친구 사이에 오해가 생겨요.`,
        narration: `그런데 이런! 갑자기 폭풍이 몰려왔어요. 꼬미는 무서워서 도망치려 했고, 버블은 실망했어요. "우리... 친구 아니었어?" 꼬미는 마음이 아팠어요.`,
        visualPrompt: `A bunny and bear cub standing apart during a gentle rain, looking sad and conflicted. Emotional scene with soft lighting, ${styleConfig.visualPromptSuffix}`,
        emotion: 'sad' as const,
      },
      action: {
        title: '용기를 내요',
        summary: `꼬미가 용기를 내서 버블을 돕고, 함께 문제를 해결해요.`,
        narration: `"버블, 미안해! 이제 도망치지 않을게!" 꼬미는 용기를 냈어요. 두 친구는 손을 잡고 함께 폭풍을 이겨냈답니다. ${topic}의 힘으로요!`,
        visualPrompt: `A brave bunny and bear cub holding hands, facing a challenge together with determined expressions. Heroic moment, ${styleConfig.visualPromptSuffix}`,
        emotion: 'brave' as const,
      },
      resolution: {
        title: '새로운 시작',
        summary: `꼬미는 ${topic}을(를) 좋아하게 되었고, 버블과 진정한 친구가 되었어요.`,
        narration: `이제 꼬미는 ${topic}을(를) 정말 좋아하게 되었어요. 그리고 버블과 평생 친구가 되었답니다. "함께라면 뭐든 할 수 있어!" 행복한 끝!`,
        visualPrompt: `A bunny and bear cub hugging happily in a beautiful sunset meadow, surrounded by flowers. Joyful ending scene, ${styleConfig.visualPromptSuffix}`,
        emotion: 'joyful' as const,
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
## 품질: ${params.quality}

## 출력 형식 (JSON)

\`\`\`json
{
  "totalDuration": 총_재생시간_초,
  "shotCount": ${params.maxShots},
  "shots": [
    {
      "id": "shot-1",
      "shotNumber": 1,
      "duration": 5,
      "narration": "나레이션 텍스트 (한국어, 아이 친화적)",
      "visualPrompt": "영어 비주얼 프롬프트 (캐릭터 외형 일관성 유지)",
      "actKey": "hook",
      "actTitle": "Act 제목 (한글)",
      "emotion": "hopeful",
      "voiceId": "Rachel",
      "speechStyle": "warm storytelling tone",
      "speaker": "narrator",
      "cameraMovement": "static"
    }
  ],
  "bgmPrompt": "전체 영상에 어울리는 BGM 영어 프롬프트"
}
\`\`\`

## 규칙:
1. **duration**: ${params.quality === 'premium' ? '10초 고정' : params.quality === 'draft' ? '5초 고정' : '일반적으로 5초, 중요한 장면(twist, action)은 10초'}

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

7. **narration**: 한국어, 3-7세가 이해할 수 있게

8. **bgmPrompt**: 영어, 아동용 애니메이션에 적합하게, ${styleConfig.description} 분위기
`

  const response = await callGemini(prompt)
  return extractJSON<GeneratedScript>(response)
}

async function mockGenerateScript(
  params: ScriptGenerationParams
): Promise<GeneratedScript> {
  await new Promise((resolve) => setTimeout(resolve, 2500))

  const { story, style, quality, maxShots } = params
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
  const protagonist = characters.find((c) => c.role === 'protagonist_a')
  const partner = characters.find((c) => c.role === 'protagonist_b')

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

    let duration: 5 | 10
    if (quality === 'draft') {
      duration = 5
    } else if (quality === 'premium') {
      duration = 10
    } else {
      duration = actKey === 'twist' || actKey === 'action' ? 10 : 5
    }

    return {
      id: `shot-${i + 1}`,
      shotNumber: i + 1,
      duration,
      narration,
      visualPrompt,
      actKey,
      actTitle,
      emotion,
      voiceId: KIDS_VOICE_PROFILES.narrator.voiceId,
      speechStyle: speechStyleMap[emotion],
      speaker: 'narrator' as const,
      cameraMovement: cameraMovements[safeIndex] ?? 'static',
    }
  })

  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0)

  const bgmPrompt = `Cheerful, uplifting orchestral music for a children's animation. ${style} style, ${styleConfig.description} atmosphere. Magical adventure theme with emotional peaks matching the 6-act story structure. Duration: ${totalDuration} seconds. Instrumental only, suitable for kids aged 3-7. Start gentle and hopeful, build through adventure, crescendo at action scene, resolve warmly.`

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
  if (GEMINI_API_KEY) return 'gemini'
  return 'mock'
}
