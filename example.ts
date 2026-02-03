import { ohnana } from './src'
import { 
  requestId, 
  logger, 
  cors, 
  errorHandler,
  health,
  rateLimiter,
  prometheus
} from './src/plugins'

const app = ohnana({
  plugins: [
    requestId(),
    logger(),
    
    // Health check con checks custom
    health({
      path: '/health',
      checks: {
        memory: () => process.memoryUsage().heapUsed < 500 * 1024 * 1024,
        uptime: () => process.uptime() > 0,
      }
    }),
    
    // Rate limiter (5 requests per 10 seconds para test)
    rateLimiter({
      windowMs: 10_000,
      max: 5,
    }),
    
    // Prometheus metrics
    prometheus(),
    
    errorHandler(),
    cors()
  ]
})

app.get('/', (c) => {
  return c.json({ 
    message: 'Hello from Ohnana!',
    requestId: c.get('requestId'),
  })
})

app.get('/slow', async (c) => {
  await new Promise(r => setTimeout(r, 100))
  return c.json({ slow: true })
})

app.get('/error', () => {
  throw new Error('Test error')
})

app.serve({ port: 3000 })
