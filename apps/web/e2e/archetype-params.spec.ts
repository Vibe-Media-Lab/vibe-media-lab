/**
 * 아키타입별 커스터마이징 파라미터 E2E 테스트
 *
 * 대상 컴포넌트: ArchetypeSelectStep (Step 1)
 * 테스트 범위:
 *  1. 아키타입 선택 시 파라미터 패널 표시
 *  2. 칩 클릭으로 파라미터 값 변경
 *  3. dark-mood + 미성년 금지 조합 (비활성 칩)
 *  4. 같은 아키타입 재클릭 시 params 유지
 *  5. advanced 더보기/접기 토글
 *  6. freetext 아키타입의 params + textarea 공존
 */

import { test, expect } from '@playwright/test'
import { setupBaseMocks } from './helpers/api-mock'

const WORKFLOW_URL = '/templates/character-creator/workflow'

// 워크플로우 Step 1(아키타입 선택) 로드 대기
async function loadStep1(page: import('@playwright/test').Page) {
  await setupBaseMocks(page)
  await page.goto(WORKFLOW_URL)
  await page.waitForSelector('[role="radiogroup"][aria-label="캐릭터 아키타입 선택"]', {
    timeout: 15_000,
  })
}

// ============================================================
// Suite 1: 아키타입 선택 시 파라미터 패널 표시
// ============================================================

test.describe('아키타입 선택 시 파라미터 패널 표시', () => {
  test('bright-3d-boy 선택 → 성별 + 나이대 칩 표시', async ({ page }) => {
    await loadStep1(page)

    // 아키타입 미선택 상태 → 파라미터 패널 없음
    await expect(page.getByText('성별')).not.toBeVisible()

    // bright-3d-boy 클릭
    await page.locator('[data-archetype-id="bright-3d-boy"]').click()

    // 파라미터 패널 등장 + 성별/나이대 레이블 표시
    await expect(page.getByText('성별')).toBeVisible()
    await expect(page.getByText('나이대')).toBeVisible()

    // 성별 옵션 칩 3개 확인
    await expect(page.getByRole('button', { name: '남성' })).toBeVisible()
    await expect(page.getByRole('button', { name: '여성' })).toBeVisible()
    await expect(page.getByRole('button', { name: '중성적' })).toBeVisible()

    // 나이대 옵션 칩 4개 확인
    await expect(page.getByRole('button', { name: '어린이' })).toBeVisible()
    await expect(page.getByRole('button', { name: '청소년' })).toBeVisible()
    await expect(page.getByRole('button', { name: '청년' })).toBeVisible()
    await expect(page.getByRole('button', { name: '성인' })).toBeVisible()
  })

  test('round-mascot-animal 선택 → 동물 종류 칩 표시', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="round-mascot-animal"]').click()

    // 동물 종류 레이블과 옵션 칩 확인
    await expect(page.getByText('동물 종류')).toBeVisible()
    await expect(page.getByRole('button', { name: '고양이' })).toBeVisible()
    await expect(page.getByRole('button', { name: '강아지' })).toBeVisible()
    await expect(page.getByRole('button', { name: '곰' })).toBeVisible()
    await expect(page.getByRole('button', { name: '토끼' })).toBeVisible()
    await expect(page.getByRole('button', { name: '펭귄' })).toBeVisible()

    // 기본값 활성 확인 (고양이 = defaultValue: 'cat')
    const catChip = page.getByRole('button', { name: '고양이' })
    await expect(catChip).toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)
  })

  test('아키타입 변경 시 이전 파라미터 패널이 새 패널로 교체', async ({ page }) => {
    await loadStep1(page)

    // round-mascot 선택 → 동물 종류 패널
    await page.locator('[data-archetype-id="round-mascot-animal"]').click()
    await expect(page.getByText('동물 종류')).toBeVisible()
    await expect(page.getByText('성별')).not.toBeVisible()

    // bright-3d-boy로 변경 → 성별/나이대 패널로 교체
    await page.locator('[data-archetype-id="bright-3d-boy"]').click()
    await expect(page.getByText('성별')).toBeVisible()
    await expect(page.getByText('동물 종류')).not.toBeVisible()
  })
})

// ============================================================
// Suite 2: 칩 클릭으로 파라미터 값 변경
// ============================================================

test.describe('칩 클릭으로 파라미터 값 변경', () => {
  test('성별 칩 — 여성 클릭 시 활성화', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="bright-3d-boy"]').click()

    // 초기 기본값: 남성 활성
    const maleChip = page.getByRole('button', { name: '남성' })
    const femaleChip = page.getByRole('button', { name: '여성' })
    await expect(maleChip).toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)
    await expect(femaleChip).not.toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)

    // 여성 클릭
    await femaleChip.click()

    // 여성 활성, 남성 비활성
    await expect(femaleChip).toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)
    await expect(maleChip).not.toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)
  })

  test('나이대 칩 — 청년 클릭 시 활성화', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="bright-3d-boy"]').click()

    // 초기 기본값: 어린이 활성
    const childChip = page.getByRole('button', { name: '어린이' })
    const youngAdultChip = page.getByRole('button', { name: '청년' })
    await expect(childChip).toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)

    // 청년 클릭
    await youngAdultChip.click()

    // 청년 활성, 어린이 비활성
    await expect(youngAdultChip).toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)
    await expect(childChip).not.toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)
  })

  test('동물 종류 칩 — 강아지 클릭 시 활성화', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="round-mascot-animal"]').click()

    const dogChip = page.getByRole('button', { name: '강아지' })
    await dogChip.click()

    await expect(dogChip).toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)
    await expect(page.getByRole('button', { name: '고양이' })).not.toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )
  })
})

// ============================================================
// Suite 3: dark-mood + 미성년 금지 조합
// ============================================================

test.describe('dark-mood-mystery — 미성년 금지 조합', () => {
  test('어린이·청소년 칩이 비활성(disabled + opacity-30) 상태', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="dark-mood-mystery"]').click()

    // dark-mood의 나이대 기본값은 young adult — 칩 패널 표시 확인
    await expect(page.getByText('나이대')).toBeVisible()

    const childChip = page.getByRole('button', { name: '어린이' })
    const teenChip = page.getByRole('button', { name: '청소년' })
    const youngAdultChip = page.getByRole('button', { name: '청년' })
    const adultChip = page.getByRole('button', { name: '성인' })

    // 비활성 칩: disabled 속성 + opacity-30 클래스
    await expect(childChip).toBeDisabled()
    await expect(childChip).toHaveClass(/opacity-30/)
    await expect(teenChip).toBeDisabled()
    await expect(teenChip).toHaveClass(/opacity-30/)

    // 허용 칩: 활성화 가능
    await expect(youngAdultChip).not.toBeDisabled()
    await expect(adultChip).not.toBeDisabled()
  })

  test('비활성 칩 클릭 → 값 변경 안됨', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="dark-mood-mystery"]').click()

    // 기본 활성: 청년
    const youngAdultChip = page.getByRole('button', { name: '청년' })
    await expect(youngAdultChip).toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)

    // 어린이 클릭 시도 (disabled이므로 실제 click 이벤트 발생 안함)
    const childChip = page.getByRole('button', { name: '어린이' })
    await childChip.click({ force: true })

    // 청년이 여전히 활성 상태 유지
    await expect(youngAdultChip).toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)
    await expect(childChip).not.toHaveClass(/bg-\[var\(--color-neon-cyan\)\]/)
  })

  test('비활성 칩에 title 툴팁 존재', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="dark-mood-mystery"]').click()

    const childChip = page.getByRole('button', { name: '어린이' })
    await expect(childChip).toHaveAttribute('title', '이 조합은 사용할 수 없습니다')
  })
})

// ============================================================
// Suite 4: 같은 아키타입 재클릭 시 params 유지
// ============================================================

test.describe('같은 아키타입 재클릭 시 params 유지', () => {
  test('파라미터 변경 후 같은 아키타입 재클릭 → 변경된 값 유지', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="bright-3d-boy"]').click()

    // 여성으로 변경
    await page.getByRole('button', { name: '여성' }).click()
    // 청년으로 변경
    await page.getByRole('button', { name: '청년' }).click()

    // 현재 상태 확인
    await expect(page.getByRole('button', { name: '여성' })).toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )
    await expect(page.getByRole('button', { name: '청년' })).toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )

    // 같은 아키타입 재클릭
    await page.locator('[data-archetype-id="bright-3d-boy"]').click()

    // 변경된 값 유지 (재클릭은 onChange 호출하지 않음)
    await expect(page.getByRole('button', { name: '여성' })).toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )
    await expect(page.getByRole('button', { name: '청년' })).toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )
  })

  test('다른 아키타입으로 변경 후 돌아오면 기본값으로 초기화', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="bright-3d-boy"]').click()

    // 여성으로 변경
    await page.getByRole('button', { name: '여성' }).click()
    await expect(page.getByRole('button', { name: '여성' })).toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )

    // round-mascot으로 변경
    await page.locator('[data-archetype-id="round-mascot-animal"]').click()
    await expect(page.getByText('동물 종류')).toBeVisible()

    // 다시 bright-3d-boy로 돌아옴 → 기본값(남성)으로 초기화
    await page.locator('[data-archetype-id="bright-3d-boy"]').click()
    await expect(page.getByRole('button', { name: '남성' })).toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )
    await expect(page.getByRole('button', { name: '여성' })).not.toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )
  })
})

// ============================================================
// Suite 5: advanced 더보기/접기 토글
// ============================================================

test.describe('advanced 더보기/접기 토글', () => {
  test('mini-fairy 선택 → primary(성별)만 표시, 더보기 버튼 존재', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="mini-fairy"]').click()

    // primary 파라미터(성별) 표시
    await expect(page.getByText('성별')).toBeVisible()

    // advanced 파라미터(요정 속성)는 숨김
    await expect(page.getByText('요정 속성')).not.toBeVisible()

    // 더보기 버튼 존재
    await expect(page.getByRole('button', { name: '더보기' })).toBeVisible()
  })

  test('더보기 클릭 → advanced(요정 속성) 표시', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="mini-fairy"]').click()
    await page.getByRole('button', { name: '더보기' }).click()

    // advanced 파라미터 표시
    await expect(page.getByText('요정 속성')).toBeVisible()
    await expect(page.getByRole('button', { name: '꽃' })).toBeVisible()
    await expect(page.getByRole('button', { name: '별' })).toBeVisible()
    await expect(page.getByRole('button', { name: '물' })).toBeVisible()
    await expect(page.getByRole('button', { name: '불' })).toBeVisible()

    // 버튼 텍스트가 '접기'로 변경
    await expect(page.getByRole('button', { name: '접기' })).toBeVisible()
    await expect(page.getByRole('button', { name: '더보기' })).not.toBeVisible()
  })

  test('접기 클릭 → advanced 다시 숨김', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="mini-fairy"]').click()

    // 더보기 → 접기
    await page.getByRole('button', { name: '더보기' }).click()
    await expect(page.getByText('요정 속성')).toBeVisible()

    await page.getByRole('button', { name: '접기' }).click()

    // advanced 다시 숨김
    await expect(page.getByText('요정 속성')).not.toBeVisible()
    await expect(page.getByRole('button', { name: '더보기' })).toBeVisible()
  })

  test('advanced 펼침 상태에서 요정 속성 칩 선택 가능', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="mini-fairy"]').click()
    await page.getByRole('button', { name: '더보기' }).click()

    // 기본값 꽃 활성
    await expect(page.getByRole('button', { name: '꽃' })).toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )

    // 별 클릭
    await page.getByRole('button', { name: '별' }).click()

    await expect(page.getByRole('button', { name: '별' })).toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )
    await expect(page.getByRole('button', { name: '꽃' })).not.toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )
  })

  test('아키타입 변경 시 더보기 상태 초기화(접힘)', async ({ page }) => {
    await loadStep1(page)

    // mini-fairy 선택 후 더보기 펼침
    await page.locator('[data-archetype-id="mini-fairy"]').click()
    await page.getByRole('button', { name: '더보기' }).click()
    await expect(page.getByText('요정 속성')).toBeVisible()

    // 다른 아키타입으로 변경 후 다시 mini-fairy
    await page.locator('[data-archetype-id="bright-3d-boy"]').click()
    await page.locator('[data-archetype-id="mini-fairy"]').click()

    // 더보기 상태 초기화 → 요정 속성 숨김
    await expect(page.getByText('요정 속성')).not.toBeVisible()
    await expect(page.getByRole('button', { name: '더보기' })).toBeVisible()
  })
})

// ============================================================
// Suite 6: freetext 아키타입 — params + textarea 공존
// ============================================================

test.describe('freetext 아키타입', () => {
  test('freetext 선택 → 성별/나이대 칩 + textarea 모두 표시', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="freetext"]').click()

    // 파라미터 패널 (성별 + 나이대)
    await expect(page.getByText('성별')).toBeVisible()
    await expect(page.getByText('나이대')).toBeVisible()

    // textarea 표시 (placeholder는 config.freeTextPlaceholder 값: '예: 날개 달린 고양이 요정...')
    await expect(page.getByLabel('캐릭터 설명')).toBeVisible()
    await expect(page.getByRole('textbox', { name: '캐릭터 설명' })).toBeVisible()
  })

  test('textarea 입력 후 칩 변경해도 텍스트 유지', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="freetext"]').click()

    const textarea = page.getByLabel('캐릭터 설명')
    await textarea.fill('빨간 망토를 두른 용감한 소녀')
    await expect(textarea).toHaveValue('빨간 망토를 두른 용감한 소녀')

    // 성별 칩 변경
    await page.getByRole('button', { name: '여성' }).click()

    // 텍스트 유지 확인
    await expect(textarea).toHaveValue('빨간 망토를 두른 용감한 소녀')
  })

  test('글자 수 카운터 표시', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="freetext"]').click()

    // 빈 상태: 0/500
    await expect(page.getByText('0/500')).toBeVisible()

    // 텍스트 입력 후 카운터 업데이트
    const textarea = page.getByLabel('캐릭터 설명')
    await textarea.fill('안녕')
    await expect(page.getByText('2/500')).toBeVisible()
  })

  test('freetext의 기본 성별 값은 중성적', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="freetext"]').click()

    // freetext defaultValue: 'neutral' → '중성적' 활성
    await expect(page.getByRole('button', { name: '중성적' })).toHaveClass(
      /bg-\[var\(--color-neon-cyan\)\]/
    )
  })

  test('freetext 선택 후 다른 아키타입으로 변경하면 textarea 사라짐', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="freetext"]').click()
    await expect(page.getByLabel('캐릭터 설명')).toBeVisible()

    // 다른 아키타입으로 변경
    await page.locator('[data-archetype-id="bright-3d-boy"]').click()
    await expect(page.getByLabel('캐릭터 설명')).not.toBeVisible()
  })
})

// ============================================================
// Suite 7: 아키타입 라디오 접근성
// ============================================================

test.describe('아키타입 라디오 접근성', () => {
  test('아키타입 버튼이 radiogroup 내 radio role을 가짐', async ({ page }) => {
    await loadStep1(page)

    const radioGroup = page.locator('[role="radiogroup"][aria-label="캐릭터 아키타입 선택"]')
    await expect(radioGroup).toBeVisible()

    // bright-3d-boy 선택 전: aria-checked=false
    const btn = page.locator('[data-archetype-id="bright-3d-boy"]')
    await expect(btn).toHaveAttribute('role', 'radio')
    await expect(btn).toHaveAttribute('aria-checked', 'false')

    // 선택 후: aria-checked=true
    await btn.click()
    await expect(btn).toHaveAttribute('aria-checked', 'true')
  })

  test('파라미터 패널 내 아키타입 라디오 그룹 외부에 위치', async ({ page }) => {
    await loadStep1(page)

    await page.locator('[data-archetype-id="bright-3d-boy"]').click()

    // 파라미터 칩 버튼은 radiogroup 내부에 없음 (별도 div)
    const radioGroup = page.locator('[role="radiogroup"]')
    const genderChip = page.getByRole('button', { name: '남성' })

    // 파라미터 칩이 radiogroup 바깥에 위치
    const isInsideRadioGroup = await radioGroup.locator('button', { hasText: '남성' }).count()
    expect(isInsideRadioGroup).toBe(0)

    // 하지만 페이지에는 존재
    await expect(genderChip).toBeVisible()
  })
})
