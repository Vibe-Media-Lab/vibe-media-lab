/**
 * 캐릭터 크리에이터 아키타입별 프롬프트 빌더
 *
 * W2: LLM visualDescription 이탈 보정 (stylePrefix/styleSuffix)
 * W3: 인프롬프트 네거티브 지시 (avoidClause)
 * W4: 아키타입별 분화된 프롬프트 템플릿 (STYLE_TEMPLATES)
 */

import type { StyleHint } from '@/lib/api/character/types'

interface StyleTemplate {
  stylePrefix: string
  styleSuffix: string
  avoidClause: string
  compositionDirective: string
}

const GENERIC_AVOID = 'Avoid: cut-off body parts, cropped limbs, busy background, low quality, blurry.'

const STYLE_TEMPLATES: Record<string, StyleTemplate> = {
  'bright-3d': {
    stylePrefix: 'Pixar-quality 3D animated character,',
    styleSuffix: 'smooth 3D rendering, soft volumetric lighting, high-fidelity subsurface scattering.',
    avoidClause: 'Avoid: 2D flat art, watercolor textures, dark moody lighting, sketch lines, low-poly, cut-off body parts, cropped limbs, busy background.',
    compositionDirective: 'Full-body, front-facing, centered on plain white background.',
  },
  'watercolor-fantasy': {
    stylePrefix: 'Ethereal watercolor fantasy character,',
    styleSuffix: 'soft ink wash strokes, translucent color layers, magical glow effects.',
    avoidClause: 'Avoid: hard digital edges, 3D rendering, cel-shading, neon colors, cut-off body parts, cropped limbs, busy background.',
    compositionDirective: 'Full-body, front-facing, centered on plain white background.',
  },
  'round-mascot': {
    stylePrefix: 'Adorable kawaii mascot character,',
    styleSuffix: 'simple flat shading, pastel palette, bold outlines, rounded forms.',
    avoidClause: 'Avoid: realistic anatomy, dark themes, complex textures, sharp angular features, cut-off body parts, cropped limbs, busy background.',
    compositionDirective: 'Full-body, front-facing, centered on plain white background.',
  },
  'dark-mood': {
    stylePrefix: 'Dramatic dark-mood character,',
    styleSuffix: 'cinematic noir lighting, high contrast, sharp angular rendering.',
    avoidClause: 'Avoid: bright pastel colors, cute rounded shapes, chibi proportions, kawaii style, cut-off body parts, cropped limbs, busy background.',
    compositionDirective: 'Full-body, front-facing, centered on plain dark background.',
  },
  'mini-chibi': {
    stylePrefix: 'Super-deformed chibi character,',
    styleSuffix: 'oversized head, tiny body, sparkle effects, cute anime rendering.',
    avoidClause: 'Avoid: realistic proportions, dark moody atmosphere, complex muscle detail, cut-off body parts, cropped limbs, busy background.',
    compositionDirective: 'Full-body, front-facing, centered on plain white background.',
  },
  'webtoon-modern': {
    stylePrefix: 'Modern Korean webtoon character,',
    styleSuffix: 'clean line art, subtle gradients, modern fashion illustration style.',
    avoidClause: 'Avoid: 3D rendering, Western comic crosshatching, watercolor textures, cut-off body parts, cropped limbs, busy background.',
    compositionDirective: 'Full-body, front-facing, centered on plain white background.',
  },
  'watercolor-emotional': {
    stylePrefix: 'Emotional watercolor anime character,',
    styleSuffix: 'dreamy soft bokeh, translucent watercolor washes, warm emotional lighting.',
    avoidClause: 'Avoid: hard digital edges, dark horror themes, neon cyber colors, cut-off body parts, cropped limbs, busy background.',
    compositionDirective: 'Full-body, front-facing, centered on plain white background.',
  },
  'mecha-sf': {
    stylePrefix: 'Futuristic sci-fi character,',
    styleSuffix: 'sleek metallic surfaces, holographic accents, neon glow effects, cyberpunk rendering.',
    avoidClause: 'Avoid: fantasy medieval elements, kawaii style, watercolor textures, organic natural scenery, cut-off body parts, cropped limbs, busy background.',
    compositionDirective: 'Full-body, front-facing, centered on plain dark background.',
  },
  'eastern-traditional': {
    stylePrefix: 'Traditional East Asian character,',
    styleSuffix: 'ink wash painting technique, elegant traditional patterns, muted earth and jewel tones.',
    avoidClause: 'Avoid: modern clothing, cyberpunk elements, neon colors, 3D rendering, cut-off body parts, cropped limbs, busy background.',
    compositionDirective: 'Full-body, front-facing, centered on plain white background.',
  },
}

function getTemplate(styleHint?: StyleHint): StyleTemplate | null {
  if (!styleHint?.visualStyle) return null
  return STYLE_TEMPLATES[styleHint.visualStyle] ?? null
}

/** promptKeywords 중 visualDescription에 아직 없는 것만 반환 */
function getMissingKeywords(visualDescription: string, keywords: string[]): string[] {
  const descLower = visualDescription.toLowerCase()
  return keywords.filter((kw) => !descLower.includes(kw.toLowerCase()))
}

/**
 * T2I 포트레이트용 프롬프트 빌더 (main-visual 단계)
 *
 * selectedVisualDescription이 프롬프트 본문.
 * styleHint는 prefix/suffix/avoid/keywords로 보강.
 */
export function buildStyledPortraitPrompt(
  visualDescription: string,
  styleHint?: StyleHint,
): string {
  const template = getTemplate(styleHint)

  if (!template) {
    return `Full-body character illustration: ${visualDescription}. Front-facing, full body from head to toe, centered composition, plain white background, no environment, no props, high quality detailed character design. ${GENERIC_AVOID}`
  }

  const missing = getMissingKeywords(visualDescription, styleHint!.promptKeywords)
  const keywordClause = missing.length > 0 ? ` Style references: ${missing.join(', ')}.` : ''

  return `${template.stylePrefix} ${visualDescription}.${keywordClause} ${template.compositionDirective} ${template.styleSuffix} ${template.avoidClause}`
}

/**
 * I2I 시트용 프롬프트 빌더 (character-sheet 단계)
 *
 * variation.prompt가 포즈/표정 지시.
 * visualDescription이 캐릭터 설명 본문.
 * styleHint가 스타일 강화.
 */
export function buildStyledSheetPrompt(
  variation: { prompt: string },
  visualDescription: string,
  styleHint?: StyleHint,
): string {
  const template = getTemplate(styleHint)

  if (!template) {
    return `${variation.prompt}. Character: ${visualDescription}. Keep the same character design, colors, and style. 1:1 aspect ratio, clean background. ${GENERIC_AVOID}`
  }

  return `${template.stylePrefix} ${variation.prompt}. Character: ${visualDescription}. Keep the same character design, colors, and style. 1:1 aspect ratio, clean background. ${template.styleSuffix} ${template.avoidClause}`
}

// ============================================================
// 스타일 인지 Variation 패딩
// ============================================================

const STYLE_VARIATIONS: Record<string, string[]> = {
  'bright-3d': [
    'with warmer Pixar palette and golden-hour lighting',
    'with cooler Disney tones and dramatic rim lighting',
    'with simplified shapes and cleaner silhouette',
  ],
  'watercolor-fantasy': [
    'with deeper ink saturation and violet undertones',
    'with lighter wash and morning mist atmosphere',
    'with more visible brush strokes and earthy palette',
  ],
  'round-mascot': [
    'with softer pastel hues and rounder proportions',
    'with brighter neon accents and bolder outlines',
    'with muted earth tones and minimal linework',
  ],
  'dark-mood': [
    'with deeper shadows and crimson accents',
    'with blue-tinted noir and moonlit atmosphere',
    'with high-contrast red and black and angular shadows',
  ],
  'mini-chibi': [
    'with sparklier effects and candy-colored palette',
    'with softer pastel tones and rounder head shape',
    'with bolder outlines and pop-art color accents',
  ],
  'webtoon-modern': [
    'with warmer skin tones and sunset-palette clothing',
    'with cooler blue-grey palette and sharper linework',
    'with minimalist flat coloring and clean composition',
  ],
  'watercolor-emotional': [
    'with warmer golden-hour wash and amber highlights',
    'with cooler twilight blues and lavender undertones',
    'with bolder ink outlines and muted watercolor fill',
  ],
  'mecha-sf': [
    'with warmer orange neon accents and weathered armor',
    'with cooler cyan holographic effects and sleeker design',
    'with minimalist white-panel armor and subtle glow lines',
  ],
  'eastern-traditional': [
    'with richer red and gold traditional palette',
    'with cooler jade and ink-wash monochrome tones',
    'with bolder brush strokes and simplified patterns',
  ],
}

const GENERIC_VARIATIONS = [
  'with warmer color palette and softer lighting',
  'with cooler tones and higher contrast',
  'with minimalist design and clean lines',
]

/**
 * LLM이 4개 variation을 못 채웠을 때 사용할 스타일 인지 패딩 suffix.
 * @param index 1, 2, 3 (0은 base 그대로)
 */
export function buildStyledVariationSuffix(
  index: number,
  styleHint?: StyleHint,
): string {
  const variations = styleHint?.visualStyle
    ? STYLE_VARIATIONS[styleHint.visualStyle] ?? GENERIC_VARIATIONS
    : GENERIC_VARIATIONS

  const clampedIndex = Math.max(0, Math.min(index - 1, variations.length - 1))
  return variations[clampedIndex] ?? GENERIC_VARIATIONS[0]!
}

/**
 * visualDescriptions 배열을 스타일 적용된 포트레이트 프롬프트 배열로 변환.
 * main-visual 라우트에서 사용.
 */
export function buildPortraitPrompts(
  profile: { visualDescription: string; visualDescriptions?: string[] },
  count: number,
  styleHint?: StyleHint,
): string[] {
  if (profile.visualDescriptions?.length) {
    return profile.visualDescriptions.slice(0, count).map((desc) =>
      buildStyledPortraitPrompt(desc, styleHint)
    )
  }
  return Array.from({ length: count }, () =>
    buildStyledPortraitPrompt(profile.visualDescription, styleHint)
  )
}
