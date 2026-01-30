import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 안전한 리다이렉트 경로인지 검증합니다.
 * Open Redirect 취약점을 방지하기 위해 상대 경로만 허용합니다.
 */
function isValidRedirectPath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false
  }

  if (!path.startsWith('/')) {
    return false
  }

  if (path.startsWith('//')) {
    return false
  }

  if (path.includes(':')) {
    return false
  }

  if (path.toLowerCase().includes('%3a')) {
    return false
  }

  if (path.includes('\\')) {
    return false
  }

  return true
}

/** 허용된 리다이렉트 경로 목록 */
const ALLOWED_REDIRECT_PATHS = ['/', '/studio', '/gallery', '/history', '/settings', '/templates', '/account']
const DEFAULT_REDIRECT_PATH = '/'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const inviteVerified = searchParams.get('invite_verified')

  // 안전한 리다이렉트 경로 결정
  let safeRedirectPath = DEFAULT_REDIRECT_PATH

  if (nextParam && isValidRedirectPath(nextParam)) {
    const isAllowedPath = ALLOWED_REDIRECT_PATHS.some(
      (allowed) => nextParam === allowed || nextParam.startsWith(`${allowed}/`)
    )
    if (isAllowedPath) {
      safeRedirectPath = nextParam
    }
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const user = data.user

      // 새 사용자인지 확인 (가입 후 1분 이내)
      const createdAt = new Date(user.created_at).getTime()
      const now = Date.now()
      const isNewUser = now - createdAt < 60 * 1000 // 1분 이내

      // 새 사용자인데 초대 코드 검증을 거치지 않은 경우 차단
      if (isNewUser && inviteVerified !== 'true') {
        // 새로 생성된 계정 삭제 (관리자 권한 필요하므로 로그아웃만 처리)
        await supabase.auth.signOut()

        const forwardedHost = request.headers.get('x-forwarded-host')
        const baseUrl = forwardedHost ? `https://${forwardedHost}` : origin
        return NextResponse.redirect(`${baseUrl}/signup?error=invite_required`)
      }

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

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
