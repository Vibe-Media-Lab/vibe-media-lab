import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function HistoryPage() {
  let generations: Array<{
    id: string
    run_id: string
    media_type: string
    prompt: string
    provider: string
    model: string
    status: string
    cost_usd: number | null
    latency_ms: number | null
    error: string | null
    created_at: string
    completed_at: string | null
  }> = []

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data } = await supabase
        .from('media_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      generations = data || []
    }
  } catch {
    // Supabase not configured
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getMediaTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      image: 'bg-purple-100 text-purple-800',
      video: 'bg-pink-100 text-pink-800',
      tts: 'bg-cyan-100 text-cyan-800',
      bgm: 'bg-orange-100 text-orange-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">History</h1>
        <p className="text-muted-foreground">
          모든 생성 기록을 확인하세요
        </p>
      </div>

      {generations.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              아직 생성 기록이 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>최근 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">타입</th>
                    <th className="text-left py-3 px-2">프롬프트</th>
                    <th className="text-left py-3 px-2">제공자</th>
                    <th className="text-left py-3 px-2">상태</th>
                    <th className="text-left py-3 px-2">비용</th>
                    <th className="text-left py-3 px-2">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {generations.map((gen) => (
                    <tr key={gen.id} className="border-b">
                      <td className="py-3 px-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${getMediaTypeBadge(gen.media_type)}`}
                        >
                          {gen.media_type}
                        </span>
                      </td>
                      <td className="py-3 px-2 max-w-xs truncate">
                        {gen.prompt}
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-muted-foreground">
                          {gen.provider}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(gen.status)}`}
                        >
                          {gen.status}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {gen.cost_usd ? `$${gen.cost_usd.toFixed(4)}` : '-'}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {new Date(gen.created_at).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
