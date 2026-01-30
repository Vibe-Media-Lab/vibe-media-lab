import { headers } from 'next/headers'

export interface RequestContext {
  requestId: string
  timestamp: Date
  ip?: string
  userAgent?: string
}

export function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `req_${timestamp}_${random}`
}

export async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers()

  const forwardedFor = headersList.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim()

  return {
    requestId: headersList.get('x-request-id') || generateRequestId(),
    timestamp: new Date(),
    ip,
    userAgent: headersList.get('user-agent') || undefined,
  }
}
