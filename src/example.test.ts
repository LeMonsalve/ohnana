import { test, expect, describe } from 'bun:test'
import { ohnana } from './index'
import { definePlugin } from './toolkit'
import { requestId, logger } from './plugins'
import { createTestClient } from './testing'

// Auth plugin for testing route groups
const auth = definePlugin({
  id: 'auth',
  requires: [requestId],
  context: {} as { userId: string },
  onRequest: async (c, next) => {
    const token = c.req.header('Authorization')
    if (token === 'Bearer valid-token') {
      c.set('userId', 'user-123')
    }
    await next()
  }
})

describe('Ohnana', () => {
  const app = ohnana({
    plugins: [requestId(), logger()]
  })
  
  app.get('/', (c) => c.json({ message: 'Hello' }))
  app.get('/echo/:name', (c) => c.json({ name: c.req.param('name') }))
  app.post('/users', async (c) => {
    const body = await c.req.json()
    return c.json({ created: body }, 201)
  })
  
  // Route group with auth plugin - use type assertion for group context
  app.group('/api', [auth()], (api) => {
    api.get('/me', (c: any) => {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401)
      }
      return c.json({ userId })
    })
  })
  
  // Route group without plugins
  app.group('/v2', (v2) => {
    v2.get('/status', (c) => c.json({ version: 2 }))
  })

  const client = createTestClient(app)

  test('GET / returns 200', async () => {
    const res = await client.get('/')
    expect(res.status).toBe(200)
    const data = await res.json<{ message: string }>()
    expect(data.message).toBe('Hello')
  })

  test('GET /echo/:name returns name', async () => {
    const res = await client.get('/echo/world')
    expect(res.status).toBe(200)
    const data = await res.json<{ name: string }>()
    expect(data.name).toBe('world')
  })

  test('POST /users creates user', async () => {
    const res = await client.post('/users', { name: 'John' })
    expect(res.status).toBe(201)
    const data = await res.json<{ created: { name: string } }>()
    expect(data.created.name).toBe('John')
  })

  test('GET /api/me without auth returns 401', async () => {
    const res = await client.get('/api/me')
    expect(res.status).toBe(401)
  })

  test('GET /api/me with valid auth returns userId', async () => {
    const res = await client.request('/api/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token' }
    })
    expect(res.status).toBe(200)
    const data = await res.json<{ userId: string }>()
    expect(data.userId).toBe('user-123')
  })
  
  test('GET /v2/status returns version (group without plugins)', async () => {
    const res = await client.get('/v2/status')
    expect(res.status).toBe(200)
    const data = await res.json<{ version: number }>()
    expect(data.version).toBe(2)
  })
})

describe('Plugin Dependencies', () => {
  test('throws if dependency missing', () => {
    expect(() => {
      ohnana({
        plugins: [auth()]  // Missing requestId
      })
    }).toThrow('requires "requestId"')
  })
})
