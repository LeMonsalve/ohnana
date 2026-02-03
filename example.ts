import { ohnana } from './src'
import { 
  requestId, 
  logger, 
  cors, 
  errorHandler,
  health,
  rateLimiter,
  prometheus,
  openapi,
  validator,
  globalLogger
} from './src/plugins'
import { z } from 'zod'

const apiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Ohnana Example API',
    version: '1.0.0',
    description: 'Example API demonstrating all Ohnana plugins'
  },
  paths: {
    '/': {
      get: {
        summary: 'Hello endpoint',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { 
                  type: 'object', 
                  properties: { 
                    message: { type: 'string' },
                    requestId: { type: 'string' }
                  } 
                }
              }
            }
          }
        }
      }
    },
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'Healthy' }
        }
      }
    }
  }
}

const app = ohnana({
  plugins: [
    requestId(),
    logger(),
    
    health({
      path: '/health',
      checks: {
        memory: () => process.memoryUsage().heapUsed < 500 * 1024 * 1024,
        uptime: () => process.uptime() > 0,
      }
    }),
    
    rateLimiter({
      windowMs: 10_000,
      max: 5,
    }),
    
    prometheus(),
    
    openapi({
      spec: apiSpec,
      theme: 'kepler'
    }),
    
    errorHandler(),
    cors()
  ]
})

const userSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0).max(150)
})

app.get('/', (c) => {
  const logger = c.get('logger')
  logger.info('Hello endpoint called')
  
  return c.json({ 
    message: 'Hello from Ohnana!',
    requestId: c.get('requestId'),
  })
})

app.post('/users', validator({ body: userSchema }), (c) => {
  const body = (c as any).get('validatedBody')
  return c.json({ success: true, user: body })
})

app.get('/slow', async (c) => {
  await new Promise(r => setTimeout(r, 100))
  return c.json({ slow: true })
})

app.get('/error', () => {
  throw new Error('Test error')
})

globalLogger.info('Starting Ohnana example server...')

app.serve({ port: 3000 })
