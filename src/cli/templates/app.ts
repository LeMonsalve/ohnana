export function appTemplate(): string {
  return `import { ohnana } from 'ohnana'
import { requestId, logger, cors, errorHandler } from 'ohnana/plugins'

const app = ohnana({
  plugins: [
    requestId(),
    logger(),
    errorHandler(),
    cors(),
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

app.serve({ port: 3000 })
`
}
