import { ohnana } from './src'
import { requestId, logger, cors, errorHandler } from './src/plugins'

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

export default app.serve({ port: 3000 })
