import { ohnana, printStartup } from './src'
import { requestId, logger, cors, errorHandler } from './src/plugins'

const startTime = Date.now()

const app = ohnana({
  plugins: [
    requestId(),
    logger(),
    errorHandler(),
    cors()
  ]
})

app.get('/', (c) => {
  return c.json({ 
    message: 'Hello from Ohnana!',
    requestId: c.get('requestId')
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.get('/error', () => {
  throw new Error('Test error')
})

const port = 3000
printStartup({ port, pluginCount: 4, startTime })

export default { port, fetch: app.fetch }
