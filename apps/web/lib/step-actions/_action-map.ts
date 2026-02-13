/**
 * StepAction 저장소 (Map)
 *
 * registry.ts와 각 action 파일 사이의 ESM 순환 의존을 끊기 위해
 * Map + register/get 함수를 별도 모듈로 분리.
 */

import type { StepAction } from './types'

const actions = new Map<string, StepAction>()

export function registerAction(action: StepAction) {
  actions.set(action.actionKey, action)
}

export function getAction(key: string): StepAction | undefined {
  return actions.get(key)
}

export function getAllActionKeys(): string[] {
  return Array.from(actions.keys())
}
