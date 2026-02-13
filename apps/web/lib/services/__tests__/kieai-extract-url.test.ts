import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractResultUrl } from '../kieai-client'

describe('extractResultUrl', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  // --- Object inputs ---

  it('extracts url field from object', () => {
    expect(extractResultUrl({ url: 'https://example.com/image.png' })).toBe(
      'https://example.com/image.png',
    )
  })

  it('extracts image_url field from object', () => {
    expect(extractResultUrl({ image_url: 'https://example.com/img.png' })).toBe(
      'https://example.com/img.png',
    )
  })

  it('extracts video_url field from object', () => {
    expect(extractResultUrl({ video_url: 'https://example.com/video.mp4' })).toBe(
      'https://example.com/video.mp4',
    )
  })

  it('extracts audio_url field from object', () => {
    expect(extractResultUrl({ audio_url: 'https://example.com/audio.mp3' })).toBe(
      'https://example.com/audio.mp3',
    )
  })

  it('extracts first element from urls array', () => {
    expect(extractResultUrl({ urls: ['https://example.com/a.png', 'https://example.com/b.png'] })).toBe(
      'https://example.com/a.png',
    )
  })

  it('extracts first element from resultUrls array', () => {
    expect(extractResultUrl({ resultUrls: ['https://example.com/r.png'] })).toBe(
      'https://example.com/r.png',
    )
  })

  it('prioritizes url over image_url', () => {
    expect(
      extractResultUrl({ url: 'https://a.com', image_url: 'https://b.com' }),
    ).toBe('https://a.com')
  })

  // --- JSON string inputs ---

  it('parses JSON string and extracts url', () => {
    const json = JSON.stringify({ url: 'https://example.com/from-string.png' })
    expect(extractResultUrl(json)).toBe('https://example.com/from-string.png')
  })

  // --- Null/undefined/empty ---

  it('returns null for undefined', () => {
    expect(extractResultUrl(undefined)).toBeNull()
  })

  it('returns null for null', () => {
    expect(extractResultUrl(null as unknown as undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractResultUrl('')).toBeNull()
  })

  it('returns null for invalid JSON string', () => {
    expect(extractResultUrl('not json')).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse resultJson'),
    )
  })

  it('returns null for empty object', () => {
    expect(extractResultUrl({})).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No URL found'),
    )
  })

  // --- Debug context ---

  it('includes debugContext in warning messages', () => {
    extractResultUrl({}, 'test-context')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('test-context'),
    )
  })
})
