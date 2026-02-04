import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface LibraryItem {
  id: string
  media_type: string
  prompt: string
  output_url: string | null
  thumbnail_url: string | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  is_favorite: boolean
  created_at: string
}

interface LibraryGroup {
  date: string
  label: string
  items: LibraryItem[]
}

interface LibraryCounts {
  all: number
  image: number
  video: number
}

interface LibraryResponse {
  success: boolean
  groups: LibraryGroup[]
  counts: LibraryCounts
  pagination: {
    page: number
    total: number
    hasMore: boolean
  }
  error?: string
}

/**
 * Format date to human-readable label
 * Uses date string (YYYY-MM-DD) for consistent comparison regardless of timezone
 */
function formatDateLabel(dateStr: string): string {
  // 오늘 날짜를 YYYY-MM-DD 형식으로 (로컬 시간 기준)
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // 어제 날짜 계산
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  if (dateStr === todayStr) {
    return 'Today'
  }
  if (dateStr === yesterdayStr) {
    return 'Yesterday'
  }

  // 그 외의 날짜는 포맷팅
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * GET /api/library
 * Query params:
 * - type: 'image' | 'video' (optional)
 * - search: string (optional)
 * - page: number (default: 1)
 * - limit: number (default: 50)
 */
export async function GET(request: NextRequest): Promise<NextResponse<LibraryResponse>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          groups: [],
          counts: { all: 0, image: 0, video: 0 },
          pagination: { page: 1, total: 0, hasMore: false },
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const mediaType = searchParams.get('type') as 'image' | 'video' | null
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = (page - 1) * limit

    // Build query for items
    let itemsQuery = supabase
      .from('media_generations')
      .select('id, media_type, prompt, output_url, thumbnail_url, width, height, duration_seconds, is_favorite, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_url', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (mediaType) {
      itemsQuery = itemsQuery.eq('media_type', mediaType)
    }

    if (search) {
      itemsQuery = itemsQuery.ilike('prompt', `%${search}%`)
    }

    const { data: items, count: itemsCount, error: itemsError } = await itemsQuery

    if (itemsError) {
      console.error('[Library API] Items query error:', itemsError)
      return NextResponse.json(
        {
          success: false,
          groups: [],
          counts: { all: 0, image: 0, video: 0 },
          pagination: { page, total: 0, hasMore: false },
          error: itemsError.message,
        },
        { status: 500 }
      )
    }

    // Get counts
    const { data: countData, error: countError } = await supabase
      .from('media_generations')
      .select('media_type')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_url', 'is', null)

    const counts: LibraryCounts = { all: 0, image: 0, video: 0 }

    if (!countError && countData) {
      for (const item of countData) {
        counts.all++
        if (item.media_type === 'image') {
          counts.image++
        } else if (item.media_type === 'video') {
          counts.video++
        }
      }
    }

    // Group by date
    const groupedMap = new Map<string, LibraryGroup>()

    for (const item of items || []) {
      const date = new Date(item.created_at)
      // 로컬 시간 기준으로 dateKey 생성 (toISOString은 UTC이므로 사용하지 않음)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const label = formatDateLabel(dateKey)

      const existingGroup = groupedMap.get(dateKey)
      if (existingGroup) {
        existingGroup.items.push(item)
      } else {
        groupedMap.set(dateKey, {
          date: dateKey,
          label,
          items: [item],
        })
      }
    }

    const groups = Array.from(groupedMap.values())
    const total = itemsCount || 0
    const hasMore = offset + limit < total

    return NextResponse.json({
      success: true,
      groups,
      counts,
      pagination: {
        page,
        total,
        hasMore,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      {
        success: false,
        groups: [],
        counts: { all: 0, image: 0, video: 0 },
        pagination: { page: 1, total: 0, hasMore: false },
        error: message,
      },
      { status: 500 }
    )
  }
}
