import { MediaRouter, type RouteRequest, type RouteResult } from '../router.js'
import { getLogger, type MediaRouterLogger } from '../logger/index.js'
import type { MediaType, GenerationConfig } from '../providers/base.js'

export interface GenerationRecord {
  id: string
  runId: string
  userId: string
  mediaType: MediaType
  prompt: string
  config: Record<string, unknown>
  provider: string
  model: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputUrl?: string
  costUsd?: number
  latencyMs?: number
  createdAt: Date
  completedAt?: Date
  error?: string
}

export interface MediaRepository {
  create(data: Omit<GenerationRecord, 'id' | 'createdAt'>): Promise<GenerationRecord>
  update(id: string, data: Partial<GenerationRecord>): Promise<GenerationRecord>
  findById(id: string): Promise<GenerationRecord | null>
  findByRunId(runId: string): Promise<GenerationRecord | null>
  findByUserId(userId: string, limit?: number): Promise<GenerationRecord[]>
}

export interface GenerateMediaInput {
  userId: string
  mediaType: MediaType
  prompt: string
  config?: GenerationConfig
  preferredProvider?: string
}

export interface GenerateMediaOutput {
  id: string
  runId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputUrl?: string
  provider: string
  model: string
  error?: string
}

export interface MediaServiceConfig {
  router: MediaRouter
  repository?: MediaRepository
  logger?: MediaRouterLogger
}

export class MediaService {
  private router: MediaRouter
  private repository?: MediaRepository
  private logger: MediaRouterLogger

  constructor(config: MediaServiceConfig) {
    this.router = config.router
    this.repository = config.repository
    this.logger = config.logger || getLogger()
  }

  async generateMedia(input: GenerateMediaInput): Promise<GenerateMediaOutput> {
    const runId = this.generateRunId()
    const logger = this.logger.withContext({
      userId: input.userId,
      runId,
      mediaType: input.mediaType,
    })

    logger.info('Starting media generation', { prompt: input.prompt.slice(0, 100) })

    const routeRequest: RouteRequest = {
      userId: input.userId,
      runId,
      mediaType: input.mediaType,
      config: {
        prompt: input.prompt,
        ...input.config,
      },
      preferredProvider: input.preferredProvider,
    }

    let record: GenerationRecord | undefined

    if (this.repository) {
      record = await this.repository.create({
        runId,
        userId: input.userId,
        mediaType: input.mediaType,
        prompt: input.prompt,
        config: input.config || {},
        provider: input.preferredProvider || 'auto',
        model: input.config?.model || 'default',
        status: 'pending',
      })

      logger.debug('Created generation record', { recordId: record.id })
    }

    try {
      const result = await this.router.route(routeRequest)

      logger.info(result.success ? 'Generation completed' : 'Generation failed', {
        success: result.success,
        provider: result.provider,
        latencyMs: result.latencyMs,
        cost: result.cost,
      })

      if (this.repository && record) {
        await this.repository.update(record.id, {
          status: result.success ? 'completed' : 'failed',
          outputUrl: result.outputUrl,
          provider: result.provider,
          latencyMs: result.latencyMs,
          costUsd: result.cost,
          completedAt: new Date(),
          error: result.error,
        })
      }

      return this.mapRouteResultToOutput(record?.id || runId, result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error('Generation error', { error: errorMessage })

      if (this.repository && record) {
        await this.repository.update(record.id, {
          status: 'failed',
          error: errorMessage,
          completedAt: new Date(),
        })
      }

      throw error
    }
  }

  async getGenerationStatus(runId: string): Promise<GenerateMediaOutput | null> {
    if (!this.repository) {
      return null
    }

    const record = await this.repository.findByRunId(runId)
    if (!record) {
      return null
    }

    return {
      id: record.id,
      runId: record.runId,
      status: record.status,
      outputUrl: record.outputUrl,
      provider: record.provider,
      model: record.model,
      error: record.error,
    }
  }

  async getUserGenerations(userId: string, limit = 10): Promise<GenerateMediaOutput[]> {
    if (!this.repository) {
      return []
    }

    const records = await this.repository.findByUserId(userId, limit)

    return records.map((record) => ({
      id: record.id,
      runId: record.runId,
      status: record.status,
      outputUrl: record.outputUrl,
      provider: record.provider,
      model: record.model,
      error: record.error,
    }))
  }

  private generateRunId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 9)
    return `run_${timestamp}_${random}`
  }

  private mapRouteResultToOutput(id: string, result: RouteResult): GenerateMediaOutput {
    return {
      id,
      runId: result.runId,
      status: result.success ? 'completed' : 'failed',
      outputUrl: result.outputUrl,
      provider: result.provider,
      model: result.metadata?.model as string || 'unknown',
      error: result.error,
    }
  }
}

export function createMediaService(config: MediaServiceConfig): MediaService {
  return new MediaService(config)
}
