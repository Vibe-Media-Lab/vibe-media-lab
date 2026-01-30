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
