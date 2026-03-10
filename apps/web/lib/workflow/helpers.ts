/**
 * Workflow Helpers
 *
 * 워크플로우 공통 유틸리티 (Kids Animation에서 추출)
 * ApiStepResult 래퍼 + unwrap 함수
 */

/** API 단계 결과의 공통 래퍼 (onChange로 저장되는 구조) */
export interface ApiStepResult<T> {
  data: { success: boolean; data: T }
  generatedAt: Date
}

/**
 * ApiStepResult<T> → T 언래핑
 *
 * 워크플로우 onChange로 저장된 단계 결과에서 실제 데이터를 추출한다.
 * 저장 구조: `{ data: { success: boolean, data: T }, generatedAt: Date }`
 *
 * @example
 * const storyData = unwrapStepResult(ctx.story)
 * const story = storyData?.story // KidsStory | undefined
 */
export function unwrapStepResult<T>(step: ApiStepResult<T> | null | undefined): T | undefined {
  if (!step) return undefined
  const resp = step.data
  if (resp && typeof resp === 'object' && 'success' in resp && 'data' in resp) {
    return resp.data
  }
  return resp as T | undefined
}

/**
 * API 응답 `{ success, data: T }` → T 언래핑
 *
 * 프리뷰 컴포넌트에서 `GenerationResult.data`를 받아 실제 데이터를 추출한다.
 * createApiHandler가 `{ success: true, data: T }` 형태로 래핑하므로,
 * 이를 벗기는 역할. Mock 데이터처럼 래핑되지 않은 경우 그대로 반환한다.
 *
 * @example
 * // 프리뷰 컴포넌트에서:
 * const response = unwrapApiData<ShotsResponse>(data)
 * const shots = response?.shots || []
 */
export function unwrapApiData<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return (data as { data: T }).data
  }
  return data as T
}
