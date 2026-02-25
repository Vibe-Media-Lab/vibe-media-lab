import { astro } from 'iztro'
import type { ZiweiChart, ZiweiPalace, ZiweiStar } from '../types.js'
import type { ZiweiInput } from '../input/normalize.js'

/**
 * iztro star → ZiweiStar 변환
 */
function mapStar(
  raw: { name: string; brightness?: string; mutagen?: string; type?: string },
  type: 'major' | 'minor' | 'adjective',
): ZiweiStar {
  return {
    name: String(raw.name ?? ''),
    type,
    brightness: String(raw.brightness ?? ''),
    mutagen: String(raw.mutagen ?? ''),
    starType: raw.type as ZiweiStar['starType'],
  }
}

/**
 * iztro 라이브러리로 자미두수 명반 계산
 *
 * iztro의 GenderName 타입은 다국어 유니온이므로 'male'/'female' 사용
 */
export function computeZiwei(input: ZiweiInput): ZiweiChart {
  // iztro는 'male'/'female' (en-US) 또는 '남'/'여' (ko-KR) 을 GenderName으로 받음
  // GenderName 유니온에 포함되도록 as any 사용
  const genderStr = input.gender as Parameters<typeof astro.bySolar>[2]

  const astrolabe = astro.bySolar(
    input.dateStr,
    input.timeIndex,
    genderStr,
    input.fixLeap,
    'ko',
  )

  // 12궁 매핑 — IFunctionalPalace 프로퍼티에 직접 접근
  const palaces: ZiweiPalace[] = astrolabe.palaces.map((p) => ({
    index: p.index,
    name: String(p.name),
    isBodyPalace: p.isBodyPalace,
    isOriginalPalace: p.isOriginalPalace,
    heavenlyStem: String(p.heavenlyStem),
    earthlyBranch: String(p.earthlyBranch),
    majorStars: p.majorStars.map((s) => mapStar(s, 'major')),
    minorStars: p.minorStars.map((s) => mapStar(s, 'minor')),
    adjectiveStars: p.adjectiveStars.map((s) => mapStar(s, 'adjective')),
    changsheng12: String(p.changsheng12),
    decadal: p.decadal
      ? {
          range: p.decadal.range as [number, number],
          heavenlyStem: String(p.decadal.heavenlyStem),
          earthlyBranch: String(p.decadal.earthlyBranch),
        }
      : null,
  }))

  return {
    palaces,
    soulPalaceEarthlyBranch: String(astrolabe.earthlyBranchOfSoulPalace),
    bodyPalaceEarthlyBranch: String(astrolabe.earthlyBranchOfBodyPalace),
    soul: String(astrolabe.soul),
    body: String(astrolabe.body),
    fiveElementsClass: String(astrolabe.fiveElementsClass),
    gender: String(astrolabe.gender),
    zodiac: String(astrolabe.zodiac),
    sign: String(astrolabe.sign),
  }
}
