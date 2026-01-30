import {
  BaseProvider,
  type GenerationConfig,
  type GenerationResult,
  type MediaType,
} from './providers/base.js'
import { RateLimiter, createUserRateLimiter } from './middleware/rate-limiter.js'
import { CostTracker, getCostTracker } from './middleware/cost-tracker.js'
import { getLogger, type MediaRouterLogger } from './logger/index.js'

interface MediaRouterConfig {
  providers: Map<string, BaseProvider>
  defaultProviders?: Partial<Record<MediaType, string>>
  userRateLimiter?: RateLimiter
  costTracker?: CostTracker
  logger?: MediaRouterLogger
}

export interface RouteRequest {
  userId: string
  runId: string
  mediaType: MediaType
  config: GenerationConfig
  preferredProvider?: string
}

export interface RouteResult extends GenerationResult {
  provider: string
  runId: string
}

export class MediaRouter {
  private providers: Map<string, BaseProvider>
  private defaultProviders: Partial<Record<MediaType, string>>
  private rateLimiter: RateLimiter
  private costTracker: CostTracker
  private logger: MediaRouterLogger

  constructor(config: MediaRouterConfig) {
    this.providers = config.providers
    this.defaultProviders = config.defaultProviders || {
      image: 'gemini',
      video: 'kling',
      tts: 'elevenlabs',
      bgm: 'suno',
    }
    this.rateLimiter = config.userRateLimiter || createUserRateLimiter()
    this.costTracker = config.costTracker || getCostTracker()
    this.logger = config.logger || getLogger()
  }

  async route(request: RouteRequest): Promise<RouteResult> {
    const { userId, runId, mediaType, config, preferredProvider } = request

    const logger = this.logger.withContext({ userId, runId, mediaType })

    // Check rate limit
    if (!this.rateLimiter.isAllowed(userId)) {
      logger.warn('Rate limit exceeded')
      return {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        latencyMs: 0,
        cost: 0,
        provider: '',
        runId,
      }
    }

    // Select provider
    const providerName = this.selectProvider(mediaType, preferredProvider)
    if (!providerName) {
      logger.error('No available provider', { mediaType, preferredProvider })
      return {
        success: false,
        error: `No provider available for ${mediaType}`,
        latencyMs: 0,
        cost: 0,
        provider: '',
        runId,
      }
    }

    const provider = this.providers.get(providerName)
    if (!provider) {
      logger.error('Provider not found', { providerName })
      return {
        success: false,
        error: `Provider ${providerName} not found`,
        latencyMs: 0,
        cost: 0,
        provider: providerName,
        runId,
      }
    }

    logger.info('Routing request', { provider: providerName, model: config.model })

    // Generate
    try {
      const result = await provider.generate(mediaType, config)

      // Track cost
      if (result.success) {
        this.costTracker.track({
          userId,
          provider: providerName,
          mediaType,
          cost: result.cost,
          timestamp: new Date(),
        })
      }

      logger.info(result.success ? 'Generation successful' : 'Generation failed', {
        provider: providerName,
        latencyMs: result.latencyMs,
        cost: result.cost,
        error: result.error,
      })

      return {
        ...result,
        provider: providerName,
        runId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Generation error', { provider: providerName, error: errorMessage })

      // Try fallback provider
      const fallbackResult = await this.tryFallback(
        mediaType,
        config,
        providerName,
        logger
      )

      if (fallbackResult) {
        return {
          ...fallbackResult,
          runId,
        }
      }

      return {
        success: false,
        error: errorMessage,
        latencyMs: 0,
        cost: 0,
        provider: providerName,
        runId,
      }
    }
  }

  private selectProvider(
    mediaType: MediaType,
    preferredProvider?: string
  ): string | null {
    // Try preferred provider first
    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider)
      if (provider?.supportsMediaType(mediaType)) {
        return preferredProvider
      }
    }

    // Try default provider
    const defaultProvider = this.defaultProviders[mediaType]
    if (defaultProvider) {
      const provider = this.providers.get(defaultProvider)
      if (provider?.supportsMediaType(mediaType)) {
        return defaultProvider
      }
    }

    // Find any available provider
    for (const [name, provider] of this.providers) {
      if (provider.supportsMediaType(mediaType)) {
        return name
      }
    }

    return null
  }

  private async tryFallback(
    mediaType: MediaType,
    config: GenerationConfig,
    excludeProvider: string,
    logger: MediaRouterLogger
  ): Promise<(GenerationResult & { provider: string }) | null> {
    for (const [name, provider] of this.providers) {
      if (name === excludeProvider) continue
      if (!provider.supportsMediaType(mediaType)) continue

      logger.info('Trying fallback provider', { provider: name })

      try {
        const result = await provider.generate(mediaType, config)
        if (result.success) {
          return { ...result, provider: name }
        }
      } catch {
        continue
      }
    }

    return null
  }

  registerProvider(name: string, provider: BaseProvider): void {
    this.providers.set(name, provider)
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  getProviderForMediaType(mediaType: MediaType): string[] {
    const result: string[] = []
    for (const [name, provider] of this.providers) {
      if (provider.supportsMediaType(mediaType)) {
        result.push(name)
      }
    }
    return result
  }
}

// Factory function
export function createMediaRouter(
  providers: Record<string, BaseProvider>
): MediaRouter {
  return new MediaRouter({
    providers: new Map(Object.entries(providers)),
  })
}
