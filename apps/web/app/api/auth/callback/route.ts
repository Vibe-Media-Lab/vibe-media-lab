import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 안전한 리다이렉트 경로인지 검증합니다.
 * Open Redirect 취약점을 방지하기 위해 상대 경로만 허용합니다.
 */
function isValidRedirectPath(path: string): boolean {
  // null, undefined, 빈 문자열 체크
  if (!path || typeof path !== 'string') {
    return false
  }

  // 상대 경로만 허용 (/ 로 시작)
  if (!path.startsWith('/')) {
    return false
  }

  // 프로토콜 상대 URL 차단 (//example.com)
  if (path.startsWith('//')) {
    return false
  }

  // 프로토콜 포함 URL 차단 (javascript:, data:, http:, https: 등)
  if (path.includes(':')) {
    return false
  }

  // URL 인코딩된 프로토콜 차단 (%3a = :)
  if (path.toLowerCase().includes('%3a')) {
    return false
  }

  // 백슬래시 차단 (일부 브라우저에서 //로 해석될 수 있음)
  if (path.includes('\\')) {
    return false
  }

  return true
}

/** 허용된 리다이렉트 경로 목록 */
const ALLOWED_REDIRECT_PATHS = ['/studio', '/gallery', '/history', '/settings', '/templates', '/account']
const DEFAULT_REDIRECT_PATH = '/studio'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')

  // 안전한 리다이렉트 경로 결정
  let safeRedirectPath = DEFAULT_REDIRECT_PATH

  if (nextParam && isValidRedirectPath(nextParam)) {
    // 추가 보안: 허용된 경로의 prefix와 일치하는지 확인
    const isAllowedPath = ALLOWED_REDIRECT_PATHS.some(
      (allowed) => nextParam === allowed || nextParam.startsWith(`${allowed}/`)
    )
    if (isAllowedPath) {
      safeRedirectPath = nextParam
    }
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${safeRedirectPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${safeRedirectPath}`)
      } else {
        return NextResponse.redirect(`${origin}${safeRedirectPath}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
