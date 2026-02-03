import type { PluginInstance } from '../types'

export type HealthCheck = () => Promise<boolean> | boolean

export interface HealthConfig {
  /** Endpoint path (default: /health) */
  path?: string
  /** Custom health checks */
  checks?: Record<string, HealthCheck>
}

export function health(config?: HealthConfig): PluginInstance<{}> {
  const path = config?.path ?? '/health'
  
  return {
    id: 'health',
    _context: {},
    hooks: {
      onInit: (app) => {
        app.get(path, async (c: any) => {
          const results: Record<string, 'ok' | 'fail'> = {}
          let healthy = true
          
          if (config?.checks) {
            for (const [name, check] of Object.entries(config.checks)) {
              try {
                const ok = await check()
                results[name] = ok ? 'ok' : 'fail'
                if (!ok) healthy = false
              } catch {
                results[name] = 'fail'
                healthy = false
              }
            }
          }
          
          const response = {
            status: healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            ...(Object.keys(results).length > 0 && { checks: results }),
          }
          
          return c.json(response, healthy ? 200 : 503)
        })
      },
    },
  }
}
