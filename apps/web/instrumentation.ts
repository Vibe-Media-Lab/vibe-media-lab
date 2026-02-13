export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export async function onRequestError(
  error: unknown,
  errorRequest: {
    path: string
    method: string
    headers: NodeJS.Dict<string | string[]>
  },
  errorContext: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'proxy'
  }
): Promise<void> {
  const { captureRequestError } = await import('@sentry/nextjs')
  captureRequestError(error, errorRequest, errorContext)
}
