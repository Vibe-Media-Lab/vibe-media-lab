import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 트레이스 샘플링 (비용 절약)
  tracesSampleRate: 0.5,

  // 세션 리플레이 (에러 발생 시만)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // 예상된 에러 필터링 (Sentry 이벤트 절약)
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value || ''

    // 크레딧 부족, 사용자 입력 오류 등 비즈니스 에러는 Sentry에 보내지 않음
    const ignoredPatterns = [
      '크레딧이 부족합니다',
      '인증이 필요합니다',
      '요청 한도를 초과',
      '입력값 검증에 실패',
      'INSUFFICIENT_CREDITS',
      'UNAUTHORIZED',
      'RATE_LIMITED',
      'VALIDATION_ERROR',
    ]

    if (ignoredPatterns.some((pattern) => message.includes(pattern))) {
      return null
    }

    return event
  },
})
