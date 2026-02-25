// ============================================================
// BirthProfile — 입력
// ============================================================

export interface BirthProfile {
  /** ISO 로컬 시간 (예: "1992-10-24T05:30") */
  birthDateTimeLocal: string
  /** IANA 시간대 (예: "Asia/Seoul") */
  timezone: string
  /** 출생지 좌표 */
  location: {
    lat: number
    lon: number
    placeName?: string
  }
  /** 양력/음력 구분 */
  calendarMode: 'solar' | 'lunar'
  /** 윤달 여부 (calendarMode='lunar' 시 사용) */
  isLeapMonth: boolean
  /** 성별 */
  gender: 'male' | 'female'
  /** 출생 시간 미상 */
  unknownTime: boolean
  /** 엔진별 설정 */
  config?: {
    saju?: SajuConfig
    ziwei?: ZiweiConfig
    western?: WesternConfig
  }
}

export interface SajuConfig {
  /** 경도 보정 사용 여부 (기본: true) */
  useLongitudeCorrection?: boolean
}

export interface ZiweiConfig {
  /** 윤달 보정 여부 (기본: true) */
  fixLeap?: boolean
}

export interface WesternConfig {
  /** 하우스 시스템 (기본: 'placidus') */
  houseSystem?: 'placidus' | 'koch' | 'equal' | 'whole-sign'
}

// ============================================================
// SajuChart — 사주 출력
// ============================================================

export interface SajuPillar {
  /** 한글 (예: "임신") */
  hangul: string
  /** 한자 (예: "壬申") */
  hanja: string
  /** 천간 */
  stem: string
  /** 지지 */
  branch: string
  /** 천간 오행 */
  stemElement: FiveElement
  /** 지지 오행 */
  branchElement: FiveElement
  /** 천간 음양 */
  stemYinYang: YinYang
  /** 지지 음양 */
  branchYinYang: YinYang
}

export type FiveElement = '목' | '화' | '토' | '금' | '수'
export type YinYang = '양' | '음'

export interface FiveElementCount {
  목: number
  화: number
  토: number
  금: number
  수: number
}

export interface YinYangBalance {
  양: number
  음: number
}

export interface SajuChart {
  pillars: {
    year: SajuPillar
    month: SajuPillar
    day: SajuPillar
    hour: SajuPillar | null
  }
  fiveElements: FiveElementCount
  yinYangBalance: YinYangBalance
  /** 음력 날짜 (manseryeok 반환) */
  lunarDate?: {
    year: number
    month: number
    day: number
    isLeapMonth: boolean
  }
  /** 경도 보정된 시간 */
  correctedTime?: {
    hour: number
    minute: number
  }
}

// ============================================================
// ZiweiChart — 자미두수 출력
// ============================================================

export interface ZiweiStar {
  name: string
  type: 'major' | 'minor' | 'adjective'
  brightness: string
  mutagen: string
}

export interface ZiweiPalace {
  index: number
  name: string
  isBodyPalace: boolean
  isOriginalPalace: boolean
  heavenlyStem: string
  earthlyBranch: string
  majorStars: ZiweiStar[]
  minorStars: ZiweiStar[]
  adjectiveStars: ZiweiStar[]
  changsheng12: string
  decadal: {
    range: [number, number]
    heavenlyStem: string
    earthlyBranch: string
  } | null
}

export interface ZiweiChart {
  palaces: ZiweiPalace[]
  /** 명궁 지지 */
  soulPalaceEarthlyBranch: string
  /** 신궁 지지 */
  bodyPalaceEarthlyBranch: string
  /** 명주 (주성) */
  soul: string
  /** 신주 (주성) */
  body: string
  /** 오행국 */
  fiveElementsClass: string
  /** 생년사화 */
  gender: string
  zodiac: string
  sign: string
}

// ============================================================
// WesternChart — 서양 점성술 출력
// ============================================================

export interface WesternPlanet {
  name: string
  longitude: number
  latitude: number
  isRetrograde: boolean
  sign: string
  degree: number
  minute: number
  second: number
  formatted: string
  house: number
  dignity: {
    state: string
    strength: number
    description: string
  }
}

export interface WesternHouseCusp {
  house: number
  longitude: number
  sign: string
  degree: number
  minute: number
  formatted: string
}

export interface WesternAspect {
  body1: string
  body2: string
  type: string
  angle: number
  orb: number
  strength: number
  isApplying: boolean
  symbol: string
}

export interface WesternAngle {
  name: string
  abbrev: string
  longitude: number
  sign: string
  degree: number
  minute: number
  second: number
  formatted: string
}

export interface WesternChart {
  planets: WesternPlanet[]
  houses: {
    system: string
    cusps: WesternHouseCusp[]
  }
  aspects: WesternAspect[]
  angles: {
    ascendant: WesternAngle
    midheaven: WesternAngle
    descendant: WesternAngle
    imumCoeli: WesternAngle
  }
  /** 태양 별자리 */
  sunSign: string
  /** 달 별자리 */
  moonSign: string
  /** 상승 별자리 */
  risingSign: string
  /** 원소 분포 */
  elements: Record<string, string[]>
  /** 양식 분포 */
  modalities: Record<string, string[]>
  /** 패턴 (Grand Trine, T-Square 등) */
  patterns: string[]
}

// ============================================================
// UnifiedChart — 통합 출력
// ============================================================

export interface ChartMeta {
  engineVersions: {
    manseryeok: string
    iztro: string
    celestine: string
  }
  configHash: string
  generatedAt: string
  systemsCompleted: ('saju' | 'ziwei' | 'western')[]
  errors: ChartError[]
  warnings: string[]
}

export interface ChartError {
  system: 'saju' | 'ziwei' | 'western'
  message: string
  code?: string
}

export interface UnifiedChart {
  saju: SajuChart | null
  ziwei: ZiweiChart | null
  western: WesternChart | null
  meta: ChartMeta
}
