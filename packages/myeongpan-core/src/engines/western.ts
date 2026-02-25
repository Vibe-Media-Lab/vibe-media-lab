import { calculateChart } from 'celestine'
import type { WesternChart, WesternPlanet, WesternHouseCusp, WesternAspect, WesternAngle } from '../types.js'
import type { WesternInput } from '../input/normalize.js'

/**
 * celestine 라이브러리로 서양 점성술 차트 계산
 *
 * celestine은 강타입을 제공하므로 프로퍼티에 직접 접근
 */
export function computeWestern(input: WesternInput): WesternChart {
  const chart = calculateChart(
    {
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      minute: input.minute,
      timezone: input.timezone,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    { houseSystem: input.houseSystem as 'placidus' | 'koch' | 'equal' | 'whole-sign' },
  )

  // 행성 매핑
  const planets: WesternPlanet[] = chart.planets.map((p) => ({
    name: p.name,
    longitude: p.longitude,
    latitude: p.latitude,
    isRetrograde: p.isRetrograde,
    sign: p.signName,
    degree: p.degree,
    minute: p.minute,
    second: p.second,
    formatted: p.formatted,
    house: p.house,
    dignity: {
      state: String(p.dignity.state),
      strength: p.dignity.strength,
      description: p.dignity.description,
    },
  }))

  // 하우스 커스프 매핑
  const cusps: WesternHouseCusp[] = chart.houses.cusps.map((c) => ({
    house: c.house,
    longitude: c.longitude,
    sign: c.signName,
    degree: c.degree,
    minute: c.minute,
    formatted: c.formatted,
  }))

  // 애스펙트 매핑
  const aspects: WesternAspect[] = chart.aspects.all.map((a) => ({
    body1: a.body1,
    body2: a.body2,
    type: String(a.type),
    angle: a.angle,
    orb: a.orb,
    strength: a.strength,
    isApplying: a.isApplying ?? false,
    symbol: a.symbol,
  }))

  // 앵글 매핑
  const mapAngle = (raw: typeof chart.angles.ascendant): WesternAngle => ({
    name: raw.name,
    abbrev: raw.abbrev,
    longitude: raw.longitude,
    sign: raw.signName,
    degree: raw.degree,
    minute: raw.minute,
    second: raw.second,
    formatted: raw.formatted,
  })

  const angles = {
    ascendant: mapAngle(chart.angles.ascendant),
    midheaven: mapAngle(chart.angles.midheaven),
    descendant: mapAngle(chart.angles.descendant),
    imumCoeli: mapAngle(chart.angles.imumCoeli),
  }

  // 서머리에서 추가 정보 추출
  const summary = chart.summary
  const elements: Record<string, string[]> = {
    fire: summary.elements.fire,
    earth: summary.elements.earth,
    air: summary.elements.air,
    water: summary.elements.water,
  }
  const modalities: Record<string, string[]> = {
    cardinal: summary.modalities.cardinal,
    fixed: summary.modalities.fixed,
    mutable: summary.modalities.mutable,
  }
  const patterns = summary.patterns

  // 태양/달/상승 별자리
  const sunPlanet = planets.find((p) => p.name === 'Sun')
  const moonPlanet = planets.find((p) => p.name === 'Moon')

  return {
    planets,
    houses: {
      system: chart.houses.systemName,
      cusps,
    },
    aspects,
    angles,
    sunSign: sunPlanet?.sign ?? 'Unknown',
    moonSign: moonPlanet?.sign ?? 'Unknown',
    risingSign: angles.ascendant.sign,
    elements,
    modalities,
    patterns,
  }
}
