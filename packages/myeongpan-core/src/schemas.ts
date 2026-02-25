import { z } from 'zod'

// ============================================================
// 엔진별 설정 스키마
// ============================================================

export const SajuConfigSchema = z.object({
  useLongitudeCorrection: z.boolean().optional().default(true),
})

export const ZiweiConfigSchema = z.object({
  fixLeap: z.boolean().optional().default(true),
})

export const WesternConfigSchema = z.object({
  houseSystem: z
    .enum(['placidus', 'koch', 'equal', 'whole-sign'])
    .optional()
    .default('placidus'),
})

// ============================================================
// BirthProfile 입력 스키마
// ============================================================

export const BirthProfileSchema = z
  .object({
    birthDateTimeLocal: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/,
        'ISO 로컬 시간 형식이어야 합니다 (예: 1992-10-24T05:30)',
      ),
    timezone: z.string().min(1, '시간대를 입력하세요'),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      placeName: z.string().optional(),
    }),
    calendarMode: z.enum(['solar', 'lunar']),
    isLeapMonth: z.boolean(),
    gender: z.enum(['male', 'female']),
    unknownTime: z.boolean(),
    config: z
      .object({
        saju: SajuConfigSchema.optional(),
        ziwei: ZiweiConfigSchema.optional(),
        western: WesternConfigSchema.optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // 실존 날짜 검증
      const [datePart] = data.birthDateTimeLocal.split('T')
      const [y, m, d] = datePart!.split('-').map(Number)
      const date = new Date(y!, m! - 1, d!)
      return date.getFullYear() === y && date.getMonth() === m! - 1 && date.getDate() === d
    },
    { message: '실존하지 않는 날짜입니다', path: ['birthDateTimeLocal'] },
  )
  .refine(
    (data) => {
      // 연도 범위 가드 (manseryeok 지원 범위)
      const year = parseInt(data.birthDateTimeLocal.substring(0, 4), 10)
      return year >= 1900 && year <= 2050
    },
    { message: '연도는 1900~2050 범위만 지원합니다', path: ['birthDateTimeLocal'] },
  )

export type ValidatedBirthProfile = z.infer<typeof BirthProfileSchema>

// ============================================================
// 출력 스키마 (테스트 검증용)
// ============================================================

const SajuPillarSchema = z.object({
  hangul: z.string(),
  hanja: z.string(),
  stem: z.string(),
  branch: z.string(),
  stemElement: z.enum(['목', '화', '토', '금', '수']),
  branchElement: z.enum(['목', '화', '토', '금', '수']),
  stemYinYang: z.enum(['양', '음']),
  branchYinYang: z.enum(['양', '음']),
})

const FiveElementCountSchema = z.object({
  목: z.number(),
  화: z.number(),
  토: z.number(),
  금: z.number(),
  수: z.number(),
})

const SajuChartSchema = z.object({
  pillars: z.object({
    year: SajuPillarSchema,
    month: SajuPillarSchema,
    day: SajuPillarSchema,
    hour: SajuPillarSchema.nullable(),
  }),
  fiveElements: FiveElementCountSchema,
  yinYangBalance: z.object({ 양: z.number(), 음: z.number() }),
  lunarDate: z
    .object({
      year: z.number(),
      month: z.number(),
      day: z.number(),
      isLeapMonth: z.boolean(),
    })
    .optional(),
  correctedTime: z
    .object({ hour: z.number(), minute: z.number() })
    .optional(),
})

const ZiweiPalaceSchema = z.object({
  index: z.number(),
  name: z.string(),
  isBodyPalace: z.boolean(),
  isOriginalPalace: z.boolean(),
  heavenlyStem: z.string(),
  earthlyBranch: z.string(),
  majorStars: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      brightness: z.string(),
      mutagen: z.string(),
    }),
  ),
  minorStars: z.array(z.object({ name: z.string(), type: z.string(), brightness: z.string(), mutagen: z.string() })),
  adjectiveStars: z.array(z.object({ name: z.string(), type: z.string(), brightness: z.string(), mutagen: z.string() })),
  changsheng12: z.string(),
  decadal: z
    .object({
      range: z.tuple([z.number(), z.number()]),
      heavenlyStem: z.string(),
      earthlyBranch: z.string(),
    })
    .nullable(),
})

const ZiweiChartSchema = z.object({
  palaces: z.array(ZiweiPalaceSchema).length(12),
  soulPalaceEarthlyBranch: z.string(),
  bodyPalaceEarthlyBranch: z.string(),
  soul: z.string(),
  body: z.string(),
  fiveElementsClass: z.string(),
  gender: z.string(),
  zodiac: z.string(),
  sign: z.string(),
})

const WesternChartSchema = z.object({
  planets: z.array(
    z.object({
      name: z.string(),
      longitude: z.number(),
      latitude: z.number(),
      isRetrograde: z.boolean(),
      sign: z.string(),
      degree: z.number(),
      minute: z.number(),
      second: z.number(),
      formatted: z.string(),
      house: z.number(),
      dignity: z.object({
        state: z.string(),
        strength: z.number(),
        description: z.string(),
      }),
    }),
  ),
  houses: z.object({
    system: z.string(),
    cusps: z.array(
      z.object({
        house: z.number(),
        longitude: z.number(),
        sign: z.string(),
        degree: z.number(),
        minute: z.number(),
        formatted: z.string(),
      }),
    ),
  }),
  aspects: z.array(
    z.object({
      body1: z.string(),
      body2: z.string(),
      type: z.string(),
      angle: z.number(),
      orb: z.number(),
      strength: z.number(),
      isApplying: z.boolean(),
      symbol: z.string(),
    }),
  ),
  angles: z.object({
    ascendant: z.object({ name: z.string(), longitude: z.number(), sign: z.string(), formatted: z.string() }).passthrough(),
    midheaven: z.object({ name: z.string(), longitude: z.number(), sign: z.string(), formatted: z.string() }).passthrough(),
    descendant: z.object({ name: z.string(), longitude: z.number(), sign: z.string(), formatted: z.string() }).passthrough(),
    imumCoeli: z.object({ name: z.string(), longitude: z.number(), sign: z.string(), formatted: z.string() }).passthrough(),
  }),
  sunSign: z.string(),
  moonSign: z.string(),
  risingSign: z.string(),
  elements: z.record(z.array(z.string())),
  modalities: z.record(z.array(z.string())),
  patterns: z.array(z.string()),
})

export const UnifiedChartSchema = z.object({
  saju: SajuChartSchema.nullable(),
  ziwei: ZiweiChartSchema.nullable(),
  western: WesternChartSchema.nullable(),
  meta: z.object({
    engineVersions: z.object({
      manseryeok: z.string(),
      iztro: z.string(),
      celestine: z.string(),
    }),
    configHash: z.string(),
    generatedAt: z.string(),
    systemsCompleted: z.array(z.enum(['saju', 'ziwei', 'western'])),
    errors: z.array(
      z.object({
        system: z.enum(['saju', 'ziwei', 'western']),
        message: z.string(),
        code: z.string().optional(),
      }),
    ),
    warnings: z.array(z.string()),
  }),
})
