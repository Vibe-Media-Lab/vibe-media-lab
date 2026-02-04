import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Request schema for updating a project
const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  currentStepIndex: z.number().int().min(0).optional(),
  status: z.enum(['in_progress', 'completed', 'cancelled']).optional(),
  stepData: z.record(z.unknown()).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  outputUrl: z.string().nullable().optional(),
})

// Response types
interface ProjectAsset {
  id: string
  mediaType: string
  prompt: string
  outputUrl: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  durationSeconds: number | null
  isFavorite: boolean
  createdAt: string
}

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

interface GetProjectResponse {
  success: boolean
  project?: ProjectResponse
  assets?: ProjectAsset[]
  error?: string
}

interface UpdateProjectResponse {
  success: boolean
  project?: ProjectResponse
  error?: string
}

interface DeleteProjectResponse {
  success: boolean
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

function transformAsset(row: Record<string, unknown>): ProjectAsset {
  return {
    id: row.id as string,
    mediaType: row.media_type as string,
    prompt: row.prompt as string,
    outputUrl: row.output_url as string | null,
    thumbnailUrl: row.thumbnail_url as string | null,
    width: row.width as number | null,
    height: row.height as number | null,
    durationSeconds: row.duration_seconds as number | null,
    isFavorite: row.is_favorite as boolean,
    createdAt: row.created_at as string,
  }
}

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]
 * Get project details with assets
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<GetProjectResponse>> {
  try {
    const { id: projectId } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select()
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { success: false, error: projectError.message },
        { status: 500 }
      )
    }

    // Get project assets
    const { data: assetsData, error: assetsError } = await supabase
      .from('media_generations')
      .select('id, media_type, prompt, output_url, thumbnail_url, width, height, duration_seconds, is_favorite, created_at')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (assetsError) {
      return NextResponse.json(
        { success: false, error: assetsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      project: transformProject(projectData as Record<string, unknown>),
      assets: (assetsData || []).map((row) => transformAsset(row as Record<string, unknown>)),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/projects/[id]
 * Update project progress
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<UpdateProjectResponse>> {
  try {
    const { id: projectId } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parseResult = updateProjectSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.message },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (parseResult.data.title !== undefined) {
      updateData.title = parseResult.data.title
    }
    if (parseResult.data.currentStepIndex !== undefined) {
      updateData.current_step_index = parseResult.data.currentStepIndex
    }
    if (parseResult.data.status !== undefined) {
      updateData.status = parseResult.data.status
      if (parseResult.data.status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
    }
    if (parseResult.data.stepData !== undefined) {
      updateData.step_data = parseResult.data.stepData
    }
    if (parseResult.data.thumbnailUrl !== undefined) {
      updateData.thumbnail_url = parseResult.data.thumbnailUrl
    }
    if (parseResult.data.outputUrl !== undefined) {
      updateData.output_url = parseResult.data.outputUrl
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        )
      }
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

/**
 * DELETE /api/projects/[id]
 * Delete a project
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<DeleteProjectResponse>> {
  try {
    const { id: projectId } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
