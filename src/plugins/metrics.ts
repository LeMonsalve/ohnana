import type { PluginInstance } from '../types'

export interface MetricsConfig {
  /** Endpoint path (default: /metrics) */
  path?: string
  /** Include path labels (can be high cardinality) */
  includePath?: boolean
}

interface Metrics {
  requestsTotal: Map<string, number>
  requestDuration: Map<string, number[]>
  inFlight: number
}

const metrics: Metrics = {
  requestsTotal: new Map(),
  requestDuration: new Map(),
  inFlight: 0,
}

function formatPrometheus(): string {
  let output = ''
  
  // http_requests_total
  output += '# HELP http_requests_total Total number of HTTP requests\n'
  output += '# TYPE http_requests_total counter\n'
  for (const [key, count] of metrics.requestsTotal) {
    const [method, status, path] = key.split('|')
    if (path) {
      output += `http_requests_total{method="${method}",status="${status}",path="${path}"} ${count}\n`
    } else {
      output += `http_requests_total{method="${method}",status="${status}"} ${count}\n`
    }
  }
  
  // http_request_duration_seconds (histogram approximation)
  output += '\n# HELP http_request_duration_ms Request duration in milliseconds\n'
  output += '# TYPE http_request_duration_ms summary\n'
  for (const [key, durations] of metrics.requestDuration) {
    if (durations.length === 0) continue
    const [method, status] = key.split('|')
    const sum = durations.reduce((a, b) => a + b, 0)
    const count = durations.length
    const avg = sum / count
    output += `http_request_duration_ms{method="${method}",status="${status}",quantile="avg"} ${avg.toFixed(2)}\n`
    output += `http_request_duration_ms_sum{method="${method}",status="${status}"} ${sum}\n`
    output += `http_request_duration_ms_count{method="${method}",status="${status}"} ${count}\n`
  }
  
  // http_requests_in_flight
  output += '\n# HELP http_requests_in_flight Current number of in-flight requests\n'
  output += '# TYPE http_requests_in_flight gauge\n'
  output += `http_requests_in_flight ${metrics.inFlight}\n`
  
  return output
}

export function prometheus(config?: MetricsConfig): PluginInstance<{}> {
  const path = config?.path ?? '/metrics'
  const includePath = config?.includePath ?? false
  
  return {
    id: 'metrics',
    _context: {},
    hooks: {
      onInit: (app) => {
        app.get(path, (c: any) => {
          return c.text(formatPrometheus(), 200, {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          })
        })
      },
      
      onRequest: async (c, next) => {
        const start = Date.now()
        metrics.inFlight++
        
        try {
          await next()
        } finally {
          metrics.inFlight--
          
          const duration = Date.now() - start
          const method = (c as any).req.method
          const status = (c as any).res.status.toString()
          const routePath = includePath ? (c as any).req.routePath ?? (c as any).req.path : undefined
          
          // Update counters
          const countKey = routePath ? `${method}|${status}|${routePath}` : `${method}|${status}`
          metrics.requestsTotal.set(countKey, (metrics.requestsTotal.get(countKey) ?? 0) + 1)
          
          // Update duration histogram
          const durationKey = `${method}|${status}`
          const durations = metrics.requestDuration.get(durationKey) ?? []
          durations.push(duration)
          // Keep last 1000 samples
          if (durations.length > 1000) durations.shift()
          metrics.requestDuration.set(durationKey, durations)
        }
      },
    },
  }
}
