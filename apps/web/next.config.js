/* eslint-disable no-undef */
import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'fluent-ffmpeg',
    'ffmpeg-static',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  // 소스맵 업로드 (Sentry에서 에러 추적 시 원본 코드 표시)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // 클라이언트에 소스맵 노출 방지
  hideSourceMaps: true,

  // 빌드 시 Sentry 설정이 없으면 무시
  silent: !process.env.SENTRY_AUTH_TOKEN,
})
