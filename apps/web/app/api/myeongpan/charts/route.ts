import { createApiHandler } from '@/lib/api/api-handler'
import { getChartsByUser } from '@/lib/services/myeongpan-service'
import type { SavedChartSummary } from '@/lib/services/myeongpan-service'

export const GET = createApiHandler<SavedChartSummary[]>(
  async (_request, context) => {
    return getChartsByUser(context.user.id)
  },
  { rateLimit: { maxRequests: 20, windowMs: 60_000 } }
)
