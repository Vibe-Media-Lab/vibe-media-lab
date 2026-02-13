import type { ShotEmotion } from '@vibe-media-lab/shared'

/**
 * 앵커/확장 이미지에서 샷별 참조 이미지를 선별하는 매핑 유틸리티
 *
 * 기존: 모든 샷에 전체 앵커 6장을 무차별 전달
 * 개선: 각 샷에 등장하는 캐릭터/배경만 선별 + 감정 매칭 확장 이미지
 */

interface AnchorInfo {
  id: string
  category: 'character' | 'background'
  name: string
  url: string
}

interface ExpandedAnchorInfo {
  id: string
  originalId: string
  category: 'character' | 'background'
  name: string
  variation: string
  url: string
}

interface ShotInfo {
  characters?: string[]
  location?: string
  emotion?: ShotEmotion | string
  speaker?: string
}

// 감정 → 확장 변형 매핑
const HAPPY_EMOTIONS = new Set([
  'joyful', 'hopeful', 'excited', 'curious', 'proud', 'grateful', 'friendly',
])
const SAD_EMOTIONS = new Set([
  'sad', 'confused', 'betrayed',
])

function getEmotionVariation(emotion?: string): string {
  if (!emotion) return 'three_quarter'
  if (HAPPY_EMOTIONS.has(emotion)) return 'happy'
  if (SAD_EMOTIONS.has(emotion)) return 'sad'
  return 'three_quarter'
}

/** 이름 정규화: trim + 공백 정규화 + 소문자 */
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** 이름 매칭: 정확 매칭 우선, 부분 매칭(includes) 시도 */
function matchName(shotName: string, anchorName: string): boolean {
  const a = normalizeName(shotName)
  const b = normalizeName(anchorName)
  if (a === b) return true
  return a.includes(b) || b.includes(a)
}

/**
 * 샷에 필요한 참조 이미지 URL 목록을 선별
 *
 * 우선순위:
 *  1. 캐릭터/배경 원본 (일관성의 기본)
 *  2. 캐릭터 감정 확장 (표정/포즈 일관성)
 *  3. 배경 medium 확장 (구도 참조)
 *
 * @returns 선별된 참조 이미지 URL 배열 (중복 제거, error URL 필터링 완료)
 */
export function selectReferenceImages(
  shot: ShotInfo,
  anchors: AnchorInfo[],
  expanded: ExpandedAnchorInfo[] = [],
): string[] {
  const characterNames = new Set<string>()

  // 1. shot.characters → 캐릭터 이름 수집
  if (shot.characters && shot.characters.length > 0) {
    for (const charName of shot.characters) {
      characterNames.add(normalizeName(charName))
    }
  }

  // 2. shot.speaker (narrator가 아닌 경우) → characters에 없으면 추가
  if (shot.speaker && shot.speaker !== 'narrator') {
    const normalized = normalizeName(shot.speaker)
    if (!characterNames.has(normalized)) {
      characterNames.add(normalized)
    }
  }

  const emotionVariation = getEmotionVariation(shot.emotion)

  // 우선순위별 URL 수집 (중복 방지용 seen Set)
  const seen = new Set<string>()
  const originals: string[] = []    // P1: 캐릭터/배경 원본
  const charExpanded: string[] = [] // P2: 캐릭터 감정 확장
  const bgExpanded: string[] = []   // P3: 배경 medium 확장

  const addUnique = (url: string, bucket: string[]) => {
    if (seen.has(url)) return
    seen.add(url)
    bucket.push(url)
  }

  // 캐릭터 매칭
  for (const anchor of anchors) {
    if (anchor.category !== 'character') continue
    const matched = [...characterNames].some(cn => matchName(cn, anchor.name))
    if (!matched) continue

    addUnique(anchor.url, originals)

    for (const exp of expanded) {
      if (exp.originalId !== anchor.id) continue
      if (exp.variation === emotionVariation) {
        addUnique(exp.url, charExpanded)
      }
    }
  }

  // 3. shot.location → 배경 앵커 매칭
  if (shot.location) {
    for (const anchor of anchors) {
      if (anchor.category !== 'background') continue
      if (!matchName(shot.location, anchor.name)) continue

      addUnique(anchor.url, originals)

      for (const exp of expanded) {
        if (exp.originalId !== anchor.id) continue
        if (exp.variation === 'medium') {
          addUnique(exp.url, bgExpanded)
        }
      }
    }
  }

  // 4. 매핑 결과 0건 → 전체 앵커 폴백
  if (seen.size === 0) {
    for (const anchor of anchors) {
      addUnique(anchor.url, originals)
    }
  }

  // 5. 우선순위 순으로 병합: 원본 → 캐릭터 확장 → 배경 확장
  const merged = [...originals, ...charExpanded, ...bgExpanded]

  // 6. error=true URL 필터링 + 빈 문자열 제거
  const sanitized = sanitizeAnchorUrls(merged)

  // 7. Gemini 참조 이미지 상한 — 90s 타임아웃 + retry 적용 후 6개까지 안전
  const MAX_REFS = 6
  if (sanitized.length <= MAX_REFS) return sanitized
  return sanitized.slice(0, MAX_REFS)
}

/**
 * URL 목록에서 유효하지 않은 URL을 필터링
 * - error=true 파라미터가 포함된 URL 제거
 * - 빈 문자열 제거
 */
export function sanitizeAnchorUrls(urls: string[]): string[] {
  return urls.filter(url => {
    if (!url || url.trim() === '') return false
    if (url.includes('error=true')) return false
    if (url.includes('picsum.photos')) return false
    return true
  })
}
