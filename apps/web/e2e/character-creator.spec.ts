import { test, expect } from '@playwright/test'
import { setupBaseMocks, mockApiResponse, captureApiRequest } from './helpers/api-mock'
import {
  MOCK_QUICKSTART,
  MOCK_MAIN_VISUAL_SUCCESS,
  MOCK_MAIN_VISUAL_PARTIAL_FAIL,
  MOCK_MAIN_VISUAL_REGENERATED,
  MOCK_CHARACTER_SHEET_SUCCESS,
  MOCK_CHARACTER_SHEET_PARTIAL_FAIL,
  MOCK_SHEET_REGENERATED,
} from './fixtures/mock-responses'

const WORKFLOW_URL = '/templates/character-creator/workflow'

// 공통 헬퍼: Step 1(archetype) → Step 2(quickstart) 까지 진행
async function advanceToStep2(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-archetype-id="bright-3d-boy"]', { timeout: 15_000 })
  await page.locator('[data-archetype-id="bright-3d-boy"]').click()
  await page.getByRole('button', { name: '다음' }).click()
}

// 공통 헬퍼: Step 2 quickstart 생성 → Step 3 까지 진행
async function advanceToStep3(page: import('@playwright/test').Page) {
  await advanceToStep2(page)
  await page.getByRole('button', { name: '생성 시작' }).click()
  await expect(page.getByText('아라곤')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: '다음' }).click()
}

// 공통 헬퍼: Step 3 main-visual 생성 + 선택 → Step 4 까지 진행
async function advanceToStep4(page: import('@playwright/test').Page) {
  await advanceToStep3(page)
  await page.getByRole('button', { name: '생성 시작' }).click()
  await expect(page.locator('[role="radio"][aria-label*="초상화"]')).toHaveCount(4, { timeout: 10_000 })
  await page.locator('[role="radio"][aria-label*="portrait-1"]').click()
  await page.getByRole('button', { name: '다음' }).click()
}

// ============================================================
// Test 1: 전체 워크플로우
// ============================================================

test.describe('Character Creator - 전체 워크플로우', () => {
  test('4단계 파이프라인 완료', async ({ page }) => {
    await setupBaseMocks(page)
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/quickstart', response: MOCK_QUICKSTART })
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/main-visual', response: MOCK_MAIN_VISUAL_SUCCESS })
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/character-sheet', response: MOCK_CHARACTER_SHEET_SUCCESS })

    await page.goto(WORKFLOW_URL)

    // Step 1: 아키타입 선택
    await page.waitForSelector('[role="radiogroup"][aria-label="캐릭터 아키타입 선택"]', { timeout: 15_000 })
    const archetypeButton = page.locator('[data-archetype-id="bright-3d-boy"]')
    await archetypeButton.click()
    await expect(archetypeButton).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: '다음' }).click()

    // Step 2: 캐릭터 프로필 생성
    await page.getByRole('button', { name: '생성 시작' }).click()
    await expect(page.getByText('아라곤')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('용감하고 지혜로운 전사')).toBeVisible()
    await page.getByRole('button', { name: '다음' }).click()

    // Step 3: 메인 비주얼 생성 + 선택
    await page.getByRole('button', { name: '생성 시작' }).click()
    await expect(page.locator('[role="radio"][aria-label*="초상화"]')).toHaveCount(4, { timeout: 10_000 })
    await expect(page.getByText(/이미지를 선택하세요.*4개/)).toBeVisible()

    const firstRadio = page.locator('[role="radio"][aria-label*="portrait-1"]')
    await firstRadio.click()
    await expect(firstRadio).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: '다음' }).click()

    // Step 4: 캐릭터 시트 생성
    await page.getByRole('button', { name: '생성 시작' }).click()

    // 4개 변형 시트 확인 (스테퍼/라벨과 중복되는 "캐릭터 시트" 대신 변형 라벨로 확인)
    await expect(page.getByText('정면')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('3/4 뷰')).toBeVisible()
    await expect(page.getByText('행복 표정')).toBeVisible()
    await expect(page.getByText('액션 포즈')).toBeVisible()

    // 캐릭터 이름 표시 확인
    await expect(page.getByRole('heading', { name: '아라곤' })).toBeVisible()
  })
})

// ============================================================
// Test 2: main-visual 개별 재생성
// ============================================================

test.describe('Main Visual - 개별 재생성', () => {
  test('개별 이미지 재생성 시 해당 이미지만 업데이트', async ({ page }) => {
    await setupBaseMocks(page)
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/quickstart', response: MOCK_QUICKSTART })
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/main-visual', response: MOCK_MAIN_VISUAL_SUCCESS })

    await page.goto(WORKFLOW_URL)
    await advanceToStep3(page)

    // main-visual 생성
    await page.getByRole('button', { name: '생성 시작' }).click()
    await expect(page.locator('[role="radio"][aria-label*="초상화"]')).toHaveCount(4, { timeout: 10_000 })

    // 재생성 mock 등록 (route는 나중에 등록한 게 우선)
    const regenCapture = await captureApiRequest(page, '**/api/character/main-visual', MOCK_MAIN_VISUAL_REGENERATED)

    // portrait-2 이미지에 hover → 재생성 버튼 클릭
    const portrait2 = page.locator('[role="radio"][aria-label*="portrait-2"]')
    await portrait2.hover()
    await portrait2.locator('button[aria-label*="portrait-2 재생성"]').click()

    // 재생성 완료 대기 — mock이 즉시 응답하므로 결과 확인
    // portrait-2 이미지 src가 Regen URL로 바뀌었는지 확인
    await expect(portrait2.locator('img')).toHaveAttribute('src', /Regen/, { timeout: 10_000 })

    // API에 regenerateIndex=1 포함 확인
    const body = regenCapture.getBody()
    expect(body).not.toBeNull()
    expect(body!.regenerateIndex).toBe(1)
  })
})

// ============================================================
// Test 3: character-sheet 개별 재생성
// ============================================================

test.describe('Character Sheet - 개별 재생성', () => {
  test('개별 시트 재생성 시 해당 시트만 업데이트', async ({ page }) => {
    await setupBaseMocks(page)
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/quickstart', response: MOCK_QUICKSTART })
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/main-visual', response: MOCK_MAIN_VISUAL_SUCCESS })
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/character-sheet', response: MOCK_CHARACTER_SHEET_SUCCESS })

    await page.goto(WORKFLOW_URL)
    await advanceToStep4(page)

    // character-sheet 생성
    await page.getByRole('button', { name: '생성 시작' }).click()
    await expect(page.getByText('정면')).toBeVisible({ timeout: 10_000 })

    // 재생성 mock
    const regenCapture = await captureApiRequest(page, '**/api/character/character-sheet', MOCK_SHEET_REGENERATED)

    // three_quarter 시트 카드에 hover → 재생성 버튼 클릭
    // 변형 라벨 "3/4 뷰"가 있는 카드의 부모 div 찾기
    const threeQuarterCard = page.locator('[class*="aspect-square"]').filter({ hasText: '3/4 뷰' })
    await threeQuarterCard.hover()
    await threeQuarterCard.locator('button[aria-label="3/4 뷰 재생성"]').click()

    // 재생성 완료 대기 — 이미지 src 확인
    await expect(threeQuarterCard.locator('img')).toHaveAttribute('src', /Regen/, { timeout: 10_000 })

    // API에 regenerateVariationId 포함 확인
    const body = regenCapture.getBody()
    expect(body).not.toBeNull()
    expect(body!.regenerateVariationId).toBe('three_quarter')
  })
})

// ============================================================
// Test 4: main-visual 부분 실패
// ============================================================

test.describe('Main Visual - 부분 실패', () => {
  test('실패 항목에 실패 오버레이 + 선택 차단', async ({ page }) => {
    await setupBaseMocks(page)
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/quickstart', response: MOCK_QUICKSTART })
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/main-visual', response: MOCK_MAIN_VISUAL_PARTIAL_FAIL })

    await page.goto(WORKFLOW_URL)
    await advanceToStep3(page)

    // 부분 실패 main-visual 생성
    await page.getByRole('button', { name: '생성 시작' }).click()
    await expect(page.locator('[role="radio"]')).toHaveCount(4, { timeout: 10_000 })

    // 성공한 2개만 카운트
    await expect(page.getByText(/이미지를 선택하세요.*2개/)).toBeVisible()

    // 실패 항목(aria-disabled) 2개
    const failedItems = page.locator('[role="radio"][aria-disabled="true"]')
    await expect(failedItems).toHaveCount(2)

    // 실패 항목에 "생성 실패" 텍스트
    await expect(page.getByText('생성 실패').first()).toBeVisible()

    // 실패 항목 클릭해도 선택되지 않음
    const failedRadio = page.locator('[role="radio"][aria-label*="portrait-2"]')
    await failedRadio.click({ force: true })
    await expect(failedRadio).toHaveAttribute('aria-checked', 'false')

    // 성공 항목은 선택 가능
    const successRadio = page.locator('[role="radio"][aria-label*="portrait-1"]')
    await successRadio.click()
    await expect(successRadio).toHaveAttribute('aria-checked', 'true')

    // 실패 항목에 재생성 버튼 표시
    const regenButton = failedItems.first().getByText('재생성')
    await expect(regenButton).toBeVisible()
  })

  test('실패 항목 재생성 후 성공 상태로 전환', async ({ page }) => {
    await setupBaseMocks(page)
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/quickstart', response: MOCK_QUICKSTART })
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/main-visual', response: MOCK_MAIN_VISUAL_PARTIAL_FAIL })

    await page.goto(WORKFLOW_URL)
    await advanceToStep3(page)

    // 부분 실패 생성
    await page.getByRole('button', { name: '생성 시작' }).click()
    await expect(page.locator('[role="radio"]')).toHaveCount(4, { timeout: 10_000 })

    // 재생성 mock
    await captureApiRequest(page, '**/api/character/main-visual', MOCK_MAIN_VISUAL_REGENERATED)

    // portrait-2 실패 항목의 재생성 버튼 클릭 (aria-disabled 부모 내부이므로 force 필요)
    const failedPortrait2 = page.locator('[role="radio"][aria-label*="portrait-2"]')
    await failedPortrait2.getByText('재생성').click({ force: true })

    // portrait-2에 이미지가 표시됨 (aria-disabled 해제)
    await expect(failedPortrait2.locator('img')).toBeVisible({ timeout: 10_000 })
    await expect(failedPortrait2).not.toHaveAttribute('aria-disabled', 'true')
  })
})

// ============================================================
// Test 5: character-sheet 부분 실패
// ============================================================

test.describe('Character Sheet - 부분 실패', () => {
  test('실패 시트에 실패 오버레이 + 재생성 가능', async ({ page }) => {
    await setupBaseMocks(page)
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/quickstart', response: MOCK_QUICKSTART })
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/main-visual', response: MOCK_MAIN_VISUAL_SUCCESS })
    await mockApiResponse(page, { method: 'POST', urlPattern: '**/api/character/character-sheet', response: MOCK_CHARACTER_SHEET_PARTIAL_FAIL })

    await page.goto(WORKFLOW_URL)
    await advanceToStep4(page)

    // 부분 실패 character-sheet 생성
    await page.getByRole('button', { name: '생성 시작' }).click()

    // 정면 + 실패 텍스트 확인
    await expect(page.getByText('정면')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('생성 실패')).toBeVisible()

    // 실패 시트의 재생성 버튼 클릭
    const failedSheet = page.getByText('생성 실패').locator('..')
    const regenBtn = failedSheet.getByText('재생성')
    await expect(regenBtn).toBeVisible()

    // 재생성 mock
    await captureApiRequest(page, '**/api/character/character-sheet', MOCK_SHEET_REGENERATED)

    await regenBtn.click({ force: true })

    // 재생성 완료 — "생성 실패" 사라짐
    await expect(page.getByText('생성 실패')).not.toBeVisible({ timeout: 10_000 })
  })
})
