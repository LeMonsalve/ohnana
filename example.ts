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
  websocket,
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
    
    // WebSocket with Pub/Sub rooms
    websocket({
      path: '/ws',
      onOpen: (client) => {
        console.log(`[WS] Client connected: ${client.id}`)
      },
      onClose: (client) => {
        console.log(`[WS] Client disconnected: ${client.id}`)
      },
      onMessage: (client, msg) => {
        // Handle custom actions beyond join/leave/broadcast
        console.log(`[WS] Custom message from ${client.id}:`, msg)
      }
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

// Broadcast to WebSocket clients from HTTP
app.post('/broadcast', async (c) => {
  const body = await c.req.json()
  const ws = c.get('ws')
  
  if (body.room) {
    ws.broadcast(body.room, body.data || body.message)
    return c.json({ 
      sent: true, 
      room: body.room,
      clients: ws.clients(body.room).size 
    })
  } else {
    ws.broadcastAll(body.data || body.message)
    return c.json({ 
      sent: true, 
      room: 'all',
      clients: ws.clientCount 
    })
  }
})

globalLogger.info('Starting Ohnana example server...')
globalLogger.info('WebSocket available at ws://localhost:3000/ws')

app.serve({ port: 3000 })
