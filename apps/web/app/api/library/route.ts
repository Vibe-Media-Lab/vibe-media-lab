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
  project_id: string | null
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
  tts: number
  bgm: number
  liked: number
}

interface LibraryResponse {
  success: boolean
  groups: LibraryGroup[]
  counts: LibraryCounts
  pagination: {
    total: number
    hasMore: boolean
    nextCursor: string | null
    nextCursorId: string | null
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
 * - cursor: ISO date string of last item's created_at (optional)
 * - cursor_id: UUID of last item (optional)
 * - limit: number (default: 100)
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
          counts: { all: 0, image: 0, video: 0, tts: 0, bgm: 0, liked: 0 },
          pagination: { total: 0, hasMore: false, nextCursor: null, nextCursorId: null },
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const mediaType = searchParams.get('type') as 'image' | 'video' | 'tts' | 'bgm' | 'liked' | null
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const cursor = searchParams.get('cursor')
    const cursorId = searchParams.get('cursor_id')

    // Build query for items (cursor-based pagination)
    let itemsQuery = supabase
      .from('media_generations')
      .select('id, media_type, prompt, output_url, thumbnail_url, width, height, duration_seconds, is_favorite, created_at, project_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_url', 'is', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1)

    // Cursor filter: items older than (or same time but lower id than) the cursor
    if (cursor && cursorId) {
      itemsQuery = itemsQuery.or(`created_at.lt.${cursor},and(created_at.eq.${cursor},id.lt.${cursorId})`)
    }

    if (mediaType === 'liked') {
      itemsQuery = itemsQuery.eq('is_favorite', true)
    } else if (mediaType) {
      itemsQuery = itemsQuery.eq('media_type', mediaType)
    }

    if (search) {
      itemsQuery = itemsQuery.ilike('prompt', `%${search}%`)
    }

    // Build total count query (filtered, without cursor)
    let totalCountQuery = supabase
      .from('media_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_url', 'is', null)

    if (mediaType === 'liked') {
      totalCountQuery = totalCountQuery.eq('is_favorite', true)
    } else if (mediaType) {
      totalCountQuery = totalCountQuery.eq('media_type', mediaType)
    }
    if (search) {
      totalCountQuery = totalCountQuery.ilike('prompt', `%${search}%`)
    }

    // Build sidebar counts query (unfiltered)
    const countsQuery = supabase
      .from('media_generations')
      .select('media_type, is_favorite')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('output_url', 'is', null)

    // Run all queries in parallel
    const [itemsResult, totalCountResult, countsResult] = await Promise.all([
      itemsQuery,
      totalCountQuery,
      countsQuery,
    ])

    if (itemsResult.error) {
      console.error('[Library API] Items query error:', itemsResult.error)
      return NextResponse.json(
        {
          success: false,
          groups: [],
          counts: { all: 0, image: 0, video: 0, tts: 0, bgm: 0, liked: 0 },
          pagination: { total: 0, hasMore: false, nextCursor: null, nextCursorId: null },
          error: itemsResult.error.message,
        },
        { status: 500 }
      )
    }

    const fetchedItems = itemsResult.data || []
    const hasMore = fetchedItems.length > limit
    const returnItems = hasMore ? fetchedItems.slice(0, limit) : fetchedItems
    const lastItem = returnItems.length > 0 ? returnItems[returnItems.length - 1] : null

    // Sidebar counts
    const counts: LibraryCounts = { all: 0, image: 0, video: 0, tts: 0, bgm: 0, liked: 0 }
    if (!countsResult.error && countsResult.data) {
      for (const item of countsResult.data) {
        counts.all++
        if (item.media_type === 'image') {
          counts.image++
        } else if (item.media_type === 'video') {
          counts.video++
        } else if (item.media_type === 'tts') {
          counts.tts++
        } else if (item.media_type === 'bgm') {
          counts.bgm++
        }
        if (item.is_favorite) {
          counts.liked++
        }
      }
    }

    // Group by date
    const groupedMap = new Map<string, LibraryGroup>()

    for (const item of returnItems) {
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
    const total = totalCountResult.count || 0

    return NextResponse.json({
      success: true,
      groups,
      counts,
      pagination: {
        total,
        hasMore,
        nextCursor: lastItem?.created_at || null,
        nextCursorId: lastItem?.id || null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      {
        success: false,
        groups: [],
        counts: { all: 0, image: 0, video: 0, tts: 0, bgm: 0, liked: 0 },
        pagination: { total: 0, hasMore: false, nextCursor: null, nextCursorId: null },
        error: message,
      },
      { status: 500 }
    )
  }
}
