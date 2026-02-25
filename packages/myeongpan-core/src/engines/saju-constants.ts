/**
 * 사주 기본 상수 — 천간/지지 매핑 테이블
 *
 * saju.ts와 saju-tables.ts에서 공유하기 위해 분리 (순환 의존 방지)
 */

import type { FiveElement, YinYang } from '../types.js'

export const STEMS: Record<string, { element: FiveElement; yinYang: YinYang }> = {
  '갑': { element: '목', yinYang: '양' },
  '을': { element: '목', yinYang: '음' },
  '병': { element: '화', yinYang: '양' },
  '정': { element: '화', yinYang: '음' },
  '무': { element: '토', yinYang: '양' },
  '기': { element: '토', yinYang: '음' },
  '경': { element: '금', yinYang: '양' },
  '신': { element: '금', yinYang: '음' },
  '임': { element: '수', yinYang: '양' },
  '계': { element: '수', yinYang: '음' },
}

export const BRANCHES: Record<string, { element: FiveElement; yinYang: YinYang }> = {
  '자': { element: '수', yinYang: '양' },
  '축': { element: '토', yinYang: '음' },
  '인': { element: '목', yinYang: '양' },
  '묘': { element: '목', yinYang: '음' },
  '진': { element: '토', yinYang: '양' },
  '사': { element: '화', yinYang: '음' },
  '오': { element: '화', yinYang: '양' },
  '미': { element: '토', yinYang: '음' },
  '신': { element: '금', yinYang: '양' },
  '유': { element: '금', yinYang: '음' },
  '술': { element: '토', yinYang: '양' },
  '해': { element: '수', yinYang: '음' },
}
