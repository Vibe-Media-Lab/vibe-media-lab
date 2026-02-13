/**
 * 사용자 친화적 에러 메시지 매핑
 *
 * 기술 에러를 한국어 메시지로 변환
 */

interface UserFriendlyError {
  message: string
  suggestion?: string
}

const ERROR_PATTERNS: Array<{
  pattern: RegExp | string
  message: string
  suggestion?: string
}> = [
  {
    pattern: /크레딧이 부족/,
    message: '크레딧이 부족합니다',
    suggestion: '크레딧을 충전한 후 다시 시도해주세요.',
  },
  {
    pattern: /INSUFFICIENT_CREDITS/,
    message: '크레딧이 부족합니다',
    suggestion: '크레딧을 충전한 후 다시 시도해주세요.',
  },
  {
    pattern: /timed? ?out|timeout|FetchTimeoutError/i,
    message: '요청 시간이 초과되었습니다',
    suggestion: '외부 서비스가 응답하지 않습니다. 잠시 후 다시 시도해주세요.',
  },
  {
    pattern: /429|요청 한도를 초과|RATE_LIMITED/,
    message: '요청이 너무 많습니다',
    suggestion: '잠시 후 다시 시도해주세요.',
  },
  {
    pattern: /네트워크|network|fetch failed|ECONNRESET/i,
    message: '네트워크 연결에 문제가 있습니다',
    suggestion: '인터넷 연결을 확인하고 다시 시도해주세요.',
  },
  {
    pattern: /인증이 필요|UNAUTHORIZED|401/,
    message: '로그인이 필요합니다',
    suggestion: '다시 로그인한 후 시도해주세요.',
  },
  {
    pattern: /finishReason.*OTHER|No response from Gemini/i,
    message: '이미지 생성 중 문제가 발생했습니다',
    suggestion: '재생성 버튼을 눌러 다시 시도해주세요.',
  },
  {
    pattern: /Task failed|Task timeout/i,
    message: '미디어 생성 작업이 실패했습니다',
    suggestion: '잠시 후 다시 시도해주세요.',
  },
  {
    pattern: /모든 샷 이미지 생성에 실패/,
    message: '샷 이미지 생성에 실패했습니다',
    suggestion: '재생성 버튼을 눌러 다시 시도해주세요.',
  },
  {
    pattern: /비디오 생성 실패/,
    message: '비디오 생성에 실패했습니다',
    suggestion: '해당 샷의 재생성 버튼을 눌러 다시 시도해주세요.',
  },
]

export function getUserFriendlyError(error: string | Error): UserFriendlyError {
  const message = typeof error === 'string' ? error : error.message

  for (const { pattern, message: userMessage, suggestion } of ERROR_PATTERNS) {
    const matches =
      typeof pattern === 'string'
        ? message.includes(pattern)
        : pattern.test(message)

    if (matches) {
      return { message: userMessage, suggestion }
    }
  }

  return {
    message: '생성 중 오류가 발생했습니다',
    suggestion: '잠시 후 다시 시도해주세요.',
  }
}
