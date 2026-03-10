import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/security/security-logger', () => ({
  logSecurityEvent: vi.fn(),
}))

import { validateFetchUrl } from '../validate-url'

describe('validateFetchUrl — allowlist positive cases', () => {
  it.each([
    'https://tempfile.aiquickdraw.com/image.png',
    'https://aiquickdraw.com/image.png',
    'https://cdn.aiquickdraw.com/image.png',
    'https://example.supabase.co/image.png',
    'https://fal-cdn.fal.ai/image.png',
    'https://v3b.fal.media/files/image.png',
    'https://storage.googleapis.com/image.png',
    'https://api.kie.ai/image.png',
    'https://cdn.suno.ai/audio.mp3',
    'https://lh3.googleusercontent.com/image.png',
  ])('allows %s', (url) => {
    expect(() => validateFetchUrl(url)).not.toThrow()
  })

  it.each([
    'https://evilaiquickdraw.com/image.png',
    'https://notfal.ai/image.png',
    'http://tempfile.aiquickdraw.com/image.png',
    'https://localhost/image.png',
    'https://evil.com/image.png',
    'https://127.0.0.1/image.png',
  ])('blocks %s', (url) => {
    expect(() => validateFetchUrl(url)).toThrow()
  })
})
