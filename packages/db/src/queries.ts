import { supabase } from './client.js'

// Type-safe helper to cast data for Supabase operations
function asInsertData<T>(data: T): T {
  return data
}

// Media Generations
export async function createMediaGeneration(
  data: {
    run_id: string
    user_id: string
    media_type: string
    prompt: string
    config: Record<string, unknown>
    provider: string
    model: string
    status?: string
  }
) {
  const { data: result, error } = await supabase
    .from('media_generations')
    .insert(asInsertData(data) as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create media generation: ${error.message}`)
  }

  return result
}

export async function updateMediaGeneration(
  id: string,
  data: {
    status?: string
    output_url?: string | null
    cost_usd?: number | null
    latency_ms?: number | null
    error?: string | null
    completed_at?: string | null
  }
) {
  const { data: result, error } = await supabase
    .from('media_generations')
    .update(asInsertData(data) as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update media generation: ${error.message}`)
  }

  return result
}

export async function getMediaGeneration(id: string) {
  const { data, error } = await supabase
    .from('media_generations')
    .select()
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to get media generation: ${error.message}`)
  }

  return data
}

export async function getMediaGenerationByRunId(runId: string) {
  const { data, error } = await supabase
    .from('media_generations')
    .select()
    .eq('run_id', runId)
    .single()

  if (error) {
    throw new Error(`Failed to get media generation: ${error.message}`)
  }

  return data
}

export async function listMediaGenerations(
  userId: string,
  options: {
    mediaType?: string
    status?: string
    limit?: number
    offset?: number
  } = {}
) {
  const { mediaType, status, limit = 20, offset = 0 } = options

  let query = supabase
    .from('media_generations')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (mediaType) {
    query = query.eq('media_type', mediaType)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to list media generations: ${error.message}`)
  }

  return { data, count }
}

// User Credits
export async function getUserCredits(userId: string) {
  const { data, error } = await supabase
    .from('user_credits')
    .select()
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user credits: ${error.message}`)
  }

  return data
}

export async function updateUserCredits(
  userId: string,
  balance: number
) {
  const { data, error } = await supabase
    .from('user_credits')
    .upsert({
      user_id: userId,
      balance,
      updated_at: new Date().toISOString(),
    } as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update user credits: ${error.message}`)
  }

  return data
}

// Users
export async function getUser(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select()
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to get user: ${error.message}`)
  }

  return data
}

export async function createOrUpdateUser(data: {
  id: string
  email: string
  display_name?: string | null
}) {
  const { data: result, error } = await supabase
    .from('users')
    .upsert(asInsertData(data) as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create/update user: ${error.message}`)
  }

  return result
}

// ============================================================
// Asset Library Functions
// ============================================================

export interface MediaGenerationGroupedByDate {
  date: string
  label: string
  items: Array<{
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
  }>
}

export interface MediaCounts {
  all: number
  image: number
  video: number
}

// Type for library items from the query
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

/**
 * List media generations grouped by date
 */
export async function listMediaGenerationsGroupedByDate(
  userId: string,
  options: {
    mediaType?: 'image' | 'video'
    search?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ groups: MediaGenerationGroupedByDate[]; total: number }> {
  const { mediaType, search, limit = 50, offset = 0 } = options

  let query = supabase
    .from('media_generations')
    .select('id, media_type, prompt, output_url, thumbnail_url, width, height, duration_seconds, is_favorite, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('output_url', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (mediaType) {
    query = query.eq('media_type', mediaType)
  }

  if (search) {
    query = query.ilike('prompt', `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to list media generations: ${error.message}`)
  }

  // Cast data to the expected type
  const items = (data || []) as unknown as LibraryItem[]

  // Group by date
  const groupedMap = new Map<string, MediaGenerationGroupedByDate>()

  for (const item of items) {
    const date = new Date(item.created_at)
    const dateKey = date.toISOString().split('T')[0] || date.toISOString().slice(0, 10)
    const label = formatDateLabel(date)

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

  return { groups, total: count || 0 }
}

/**
 * Get media counts by type
 */
export async function getMediaCounts(userId: string): Promise<MediaCounts> {
  const { data, error } = await supabase
    .from('media_generations')
    .select('media_type')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('output_url', 'is', null)

  if (error) {
    throw new Error(`Failed to get media counts: ${error.message}`)
  }

  const counts: MediaCounts = { all: 0, image: 0, video: 0 }
  const items = (data || []) as Array<{ media_type: string }>

  for (const item of items) {
    counts.all++
    if (item.media_type === 'image') {
      counts.image++
    } else if (item.media_type === 'video') {
      counts.video++
    }
  }

  return counts
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  id: string,
  userId: string
): Promise<boolean> {
  // First get current status
  const { data: current, error: getError } = await supabase
    .from('media_generations')
    .select('is_favorite')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (getError) {
    throw new Error(`Failed to get media generation: ${getError.message}`)
  }

  const currentData = current as { is_favorite: boolean } | null
  const newValue = !(currentData?.is_favorite ?? false)

  const { error: updateError } = await supabase
    .from('media_generations')
    .update({ is_favorite: newValue } as never)
    .eq('id', id)
    .eq('user_id', userId)

  if (updateError) {
    throw new Error(`Failed to toggle favorite: ${updateError.message}`)
  }

  return newValue
}

/**
 * Delete media generation
 */
export async function deleteMediaGeneration(
  id: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('media_generations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete media generation: ${error.message}`)
  }
}

/**
 * Format date to human-readable label
 */
function formatDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateOnly.getTime() === today.getTime()) {
    return 'Today'
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ============================================================
// Project Functions
// ============================================================

export type ProjectStatus = 'in_progress' | 'completed' | 'cancelled'

export interface Project {
  id: string
  user_id: string
  template_id: string
  title: string
  current_step_index: number
  status: ProjectStatus
  step_data: Record<string, unknown>
  session_id: string | null
  thumbnail_url: string | null
  output_url: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface CreateProjectData {
  user_id: string
  template_id: string
  title: string
  session_id?: string
}

export interface UpdateProjectData {
  current_step_index?: number
  status?: ProjectStatus
  step_data?: Record<string, unknown>
  thumbnail_url?: string | null
  output_url?: string | null
  completed_at?: string | null
}

/**
 * Create a new project
 */
export async function createProject(data: CreateProjectData): Promise<Project> {
  const { data: result, error } = await supabase
    .from('projects')
    .insert(asInsertData({
      user_id: data.user_id,
      template_id: data.template_id,
      title: data.title,
      session_id: data.session_id || null,
      step_data: {},
      current_step_index: 0,
      status: 'in_progress' as const,
    }) as never)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`)
  }

  return result as unknown as Project
}

/**
 * Get a project by ID
 */
export async function getProject(projectId: string, userId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select()
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get project: ${error.message}`)
  }

  return data as unknown as Project
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  userId: string,
  data: UpdateProjectData
): Promise<Project> {
  const { data: result, error } = await supabase
    .from('projects')
    .update(asInsertData(data) as never)
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update project: ${error.message}`)
  }

  return result as unknown as Project
}

export interface ListProjectsOptions {
  status?: ProjectStatus
  templateId?: string
  limit?: number
  offset?: number
}

/**
 * List projects for a user
 */
export async function listProjects(
  userId: string,
  options: ListProjectsOptions = {}
): Promise<{ data: Project[]; count: number }> {
  const { status, templateId, limit = 20, offset = 0 } = options

  let query = supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
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
    throw new Error(`Failed to list projects: ${error.message}`)
  }

  return { data: (data || []) as unknown as Project[], count: count || 0 }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`)
  }
}

/**
 * Get project with its assets
 */
export async function getProjectWithAssets(
  projectId: string,
  userId: string
): Promise<{ project: Project; assets: LibraryItem[] } | null> {
  const project = await getProject(projectId, userId)

  if (!project) {
    return null
  }

  const { data: assets, error } = await supabase
    .from('media_generations')
    .select('id, media_type, prompt, output_url, thumbnail_url, width, height, duration_seconds, is_favorite, created_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get project assets: ${error.message}`)
  }

  return {
    project,
    assets: (assets || []) as unknown as LibraryItem[],
  }
}
