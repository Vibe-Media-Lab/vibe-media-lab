import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Request schema for creating a project
const createProjectSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(1),
  sessionId: z.string().optional(),
})

// Response types
interface ProjectResponse {
  id: string
  templateId: string
  title: string
  currentStepIndex: number
  status: 'in_progress' | 'completed' | 'cancelled'
  stepData: Record<string, unknown>
  sessionId: string | null
  thumbnailUrl: string | null
  outputUrl: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

interface ListProjectsResponse {
  success: boolean
  projects: ProjectResponse[]
  pagination: {
    page: number
    total: number
    hasMore: boolean
  }
  error?: string
}

interface CreateProjectResponse {
  success: boolean
  project?: ProjectResponse
  error?: string
}

// Transform DB row to API response
function transformProject(row: Record<string, unknown>): ProjectResponse {
  return {
    id: row.id as string,
    templateId: row.template_id as string,
    title: row.title as string,
    currentStepIndex: row.current_step_index as number,
    status: row.status as 'in_progress' | 'completed' | 'cancelled',
    stepData: row.step_data as Record<string, unknown>,
    sessionId: row.session_id as string | null,
    thumbnailUrl: row.thumbnail_url as string | null,
    outputUrl: row.output_url as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: row.completed_at as string | null,
  }
}

/**
 * GET /api/projects
 * List projects for the authenticated user
 * Query params:
 * - status: 'in_progress' | 'completed' | 'cancelled' (optional)
 * - templateId: string (optional)
 * - page: number (default: 1)
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ListProjectsResponse>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          projects: [],
          pagination: { page: 1, total: 0, hasMore: false },
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as 'in_progress' | 'completed' | 'cancelled' | null
    const templateId = searchParams.get('templateId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (templateId) {
      query = query.eq('template_id', templateId)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json(
        {
          success: false,
          projects: [],
          pagination: { page, total: 0, hasMore: false },
          error: error.message,
        },
        { status: 500 }
      )
    }

    const projects = (data || []).map((row) => transformProject(row as Record<string, unknown>))
    const total = count || 0
    const hasMore = offset + limit < total

    return NextResponse.json({
      success: true,
      projects,
      pagination: { page, total, hasMore },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      {
        success: false,
        projects: [],
        pagination: { page: 1, total: 0, hasMore: false },
        error: message,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateProjectResponse>> {
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
    const parseResult = createProjectSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.message },
        { status: 400 }
      )
    }

    const { templateId, title, sessionId } = parseResult.data

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        template_id: templateId,
        title,
        session_id: sessionId || null,
        step_data: {},
        current_step_index: 0,
        status: 'in_progress',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      project: transformProject(data as Record<string, unknown>),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
