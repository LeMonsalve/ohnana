export function healthRouteTemplate(): string {
  return `import type { Context } from 'hono'

export function healthRoute(c: Context) {
  return c.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  })
}
`
}
