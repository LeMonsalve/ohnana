import { uhono } from './src'
import { requestId, logger, cors, errorHandler } from './src/plugins'

const app = uhono({
  plugins: [
    requestId(),
    logger(),
    errorHandler(),
    cors()
  ]
})

app.get('/', (c) => {
  const id = c.get('requestId')
  return c.json({ 
    message: 'Hello uHono!',
    requestId: id 
  })
})

app.get('/error', () => {
  throw new Error('Test error')
})

export default app
