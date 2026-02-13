import { vi, beforeEach } from 'vitest'

// fetch를 글로벌 mock으로 등록
global.fetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})
