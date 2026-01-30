import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SettingsPage() {
  let user = null

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase not configured
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          계정 및 API 설정을 관리하세요
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>프로필</CardTitle>
            <CardDescription>계정 정보를 확인하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                이메일
              </label>
              <p className="mt-1">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                가입일
              </label>
              <p className="mt-1">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('ko-KR')
                  : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <CardTitle>API 키</CardTitle>
            <CardDescription>
              외부 AI 서비스 API 키를 관리하세요 (준비 중)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              API 키 관리 기능은 Phase 3에서 추가될 예정입니다.
            </p>
          </CardContent>
        </Card>

        {/* Usage Section */}
        <Card>
          <CardHeader>
            <CardTitle>사용량</CardTitle>
            <CardDescription>
              이번 달 사용량을 확인하세요 (준비 중)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              사용량 대시보드는 Phase 3에서 추가될 예정입니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
