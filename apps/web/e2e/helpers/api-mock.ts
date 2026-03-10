import type { Page, Route } from '@playwright/test'
import { MOCK_PROJECT } from '../fixtures/mock-responses'

type MockHandler = {
  method: string
  urlPattern: string | RegExp
  response: unknown
  status?: number
}

/**
 * 공통 API mock 설정.
 * 프로젝트 생성/조회 + Supabase auth 우회.
 */
export async function setupBaseMocks(page: Page) {
  // POST /api/projects — 새 프로젝트 생성
  await page.route('**/api/projects', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PROJECT) })
    } else {
      await route.continue()
    }
  })

  // GET /api/projects/:id — 프로젝트 조회 (없으면 404)
  await page.route('**/api/projects/*', async (route: Route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false }) })
  })

  // Supabase auth session — 비로그인 상태 허용
  await page.route('**/**/auth/**', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: null }) })
  })

  // 프로젝트 자동 저장 mock (PUT)
  await page.route('**/api/projects/*/save', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  })

  // 라이브러리 즐겨찾기
  await page.route('**/api/library/favorite', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  })
}

/**
 * 특정 API 응답을 mock.
 */
export async function mockApiResponse(page: Page, handler: MockHandler) {
  const { method, urlPattern, response, status = 200 } = handler
  await page.route(urlPattern, async (route: Route) => {
    if (route.request().method() === method) {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * API 호출을 가로채서 request body를 캡처.
 */
export async function captureApiRequest(
  page: Page,
  urlPattern: string | RegExp,
  response: unknown,
): Promise<{ getBody: () => Record<string, unknown> | null }> {
  let capturedBody: Record<string, unknown> | null = null

  await page.route(urlPattern, async (route: Route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      try {
        capturedBody = JSON.parse(request.postData() || '{}')
      } catch {
        capturedBody = null
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  return { getBody: () => capturedBody }
}
