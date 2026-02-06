import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/library/favorite
 * Toggle favorite status by output_url
 *
 * Body: { outputUrl: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { outputUrl } = body as { outputUrl?: string }

    if (!outputUrl) {
      return NextResponse.json(
        { success: false, error: 'outputUrl is required' },
        { status: 400 }
      )
    }

    // Find record by output_url + user_id
    const { data: current, error: fetchError } = await supabase
      .from('media_generations')
      .select('id, is_favorite')
      .eq('user_id', user.id)
      .eq('output_url', outputUrl)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Toggle favorite
    const newFavorite = !current.is_favorite
    const { error: updateError } = await supabase
      .from('media_generations')
      .update({ is_favorite: newFavorite })
      .eq('id', current.id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { id: current.id, is_favorite: newFavorite },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
