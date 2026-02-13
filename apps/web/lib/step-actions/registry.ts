/**
 * StepAction 레지스트리
 *
 * side-effect import로 각 액션이 자동 등록된다.
 * assertAllRegistered()로 필수 액션 누락을 검증한다.
 *
 * Map + register/get은 _action-map.ts에 분리 (ESM 순환 의존 방지).
 */

import { getAction } from './_action-map'

// Re-export for external consumers
export { registerAction, getAction } from './_action-map'

/** 필수 액션키가 모두 등록되었는지 검증 (개발 모드) */
const REQUIRED_ACTIONS = [
  'kids/story',
  'kids/script',
  'kids/expand',
  'kids/shots',
  'kids/videos',
  'kids/audio',
  'kids/final',
]

export function assertAllRegistered(): void {
  const missing = REQUIRED_ACTIONS.filter((key) => !getAction(key))
  if (missing.length > 0) {
    const msg = `[StepAction Registry] 미등록 액션: ${missing.join(', ')}`
    if (process.env.NODE_ENV === 'development') {
      console.error(msg)
    }
  }
}

// Side-effect imports로 자동 등록
import './kids/story-action'
import './kids/script-action'
import './kids/anchors-action'
import './kids/expand-action'
import './kids/shots-action'
import './kids/videos-action'
import './kids/audio-action'
import './kids/final-action'

// 부팅 검증
assertAllRegistered()
