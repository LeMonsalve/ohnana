import { ohnana } from './src'
import { definePlugin } from './src/toolkit'
import { requestId, logger, cors, errorHandler } from './src/plugins'

// Plugin de ejemplo con shutdown hook
const dbPlugin = definePlugin({
  id: 'database',
  requires: [requestId],  // Demo de dependencia tipada
  context: {} as { db: string },
  
  onInit: () => {
    console.log('[database] Connected to database')
  },
  
  onRequest: async (c, next) => {
    // requestId está disponible gracias a requires
    const reqId = c.get('requestId')
    c.set('db', `db-connection-${reqId.slice(0, 8)}`)
    await next()
  },
  
  onShutdown: async () => {
    // Simular cierre de conexión
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log('[database] Connection closed')
  }
})

const app = ohnana({
  plugins: [
    requestId(),
    logger(),
    dbPlugin(),
    errorHandler(),
    cors()
  ]
})

app.get('/', (c) => {
  return c.json({ 
    message: 'Hello from Ohnana!',
    requestId: c.get('requestId'),
    db: c.get('db'),
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.get('/error', () => {
  throw new Error('Test error')
})

// Graceful shutdown automático - prueba con Ctrl+C
app.serve({ port: 3000 })
