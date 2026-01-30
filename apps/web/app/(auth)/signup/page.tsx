'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupSkeleton />}>
      <SignupFlow />
    </Suspense>
  )
}

function SignupSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>새 계정을 만들어 시작하세요</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    </div>
  )
}

function SignupFlow() {
  const [inviteCodeVerified, setInviteCodeVerified] = useState(false)
  const [verifiedCode, setVerifiedCode] = useState('')

  if (!inviteCodeVerified) {
    return (
      <InviteCodeStep
        onVerified={(code) => {
          setVerifiedCode(code)
          setInviteCodeVerified(true)
        }}
      />
    )
  }

  return <SignupForm inviteCode={verifiedCode} />
}

function InviteCodeStep({ onVerified }: { onVerified: (code: string) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!code.trim()) {
      setError('초대 코드를 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-invite-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await response.json()

      if (!data.valid) {
        setError(data.error || '유효하지 않은 초대 코드입니다.')
        return
      }

      onVerified(code.trim())
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">초대 코드 입력</CardTitle>
          <CardDescription>
            현재 베타 서비스 중입니다.
            <br />
            초대 코드가 있으시면 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">초대 코드</Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="초대 코드를 입력하세요"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest"
                autoComplete="off"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner size="sm" /> : '확인'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <p className="text-sm text-muted-foreground text-center">
            초대 코드가 없으신가요?
            <br />
            관리자에게 문의해주세요.
          </p>
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

function SignupForm({ inviteCode }: { inviteCode: string }) {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/studio'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    // 비밀번호 정책 검증 (최소 8자, 대소문자, 숫자 포함)
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.')
      return
    }

    if (!/[A-Z]/.test(password)) {
      setError('비밀번호에 대문자를 포함해야 합니다.')
      return
    }

    if (!/[a-z]/.test(password)) {
      setError('비밀번호에 소문자를 포함해야 합니다.')
      return
    }

    if (!/[0-9]/.test(password)) {
      setError('비밀번호에 숫자를 포함해야 합니다.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          data: {
            invite_code: inviteCode,
          },
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } catch {
      setError('Google 로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">이메일 확인</CardTitle>
            <CardDescription>
              {email}로 확인 이메일을 보냈습니다. 이메일의 링크를 클릭하여 회원가입을
              완료하세요.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login" className="text-primary hover:underline">
              로그인으로 돌아가기
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>새 계정을 만들어 시작하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Google로 계속하기
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="8자 이상, 대소문자 + 숫자"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                최소 8자, 대문자/소문자/숫자 포함
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner size="sm" /> : '회원가입'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
