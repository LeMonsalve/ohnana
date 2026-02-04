import { test, expect, describe } from 'bun:test'
import { ohnana } from '../index'
import { definePlugin } from '../toolkit'
import { requestId } from '../plugins'
import type { Context } from 'hono'

describe('Type Safety Tests', () => {
  describe('Plugin Context Access Without Casts', () => {
    test('plugin can access c.req.method without casting', () => {
      const testPlugin = definePlugin({
        id: 'test-req-access',
        context: {} as {},
        onRequest: async (c, next) => {
          // This should NOT require (c as any)
          const method: string = c.req.method
          const path: string = c.req.path
          expect(typeof method).toBe('string')
          expect(typeof path).toBe('string')
          await next()
        }
      })

      const app = ohnana({ plugins: [testPlugin()] })
      app.get('/test', (c) => c.json({ ok: true }))
      
      // Runtime test passes if types compile
      expect(app).toBeDefined()
    })

    test('plugin can access c.res.status without casting', async () => {
      let capturedStatus: number | undefined

      const testPlugin = definePlugin({
        id: 'test-res-access',
        context: {} as {},
        onResponse: (c, response) => {
          // This should NOT require (c as any)
          capturedStatus = response.status
          return response
        }
      })

      const app = ohnana({ plugins: [testPlugin()] })
      app.get('/test', (c) => c.json({ ok: true }))
      
      expect(app).toBeDefined()
    })
  })

  describe('Custom Context Type Inference', () => {
    test('plugin can access custom context keys with proper types', () => {
      const myPlugin = definePlugin({
        id: 'my-plugin',
        context: {} as { myValue: string; myNumber: number },
        onRequest: async (c, next) => {
          // Should be typed without cast
          c.set('myValue', 'hello')
          c.set('myNumber', 42)
          await next()
        }
      })

      const app = ohnana({ plugins: [myPlugin()] })
      app.get('/test', (c) => {
        // These should be properly typed
        const value: string = c.get('myValue')
        const num: number = c.get('myNumber')
        
        return c.json({ value, num })
      })

      expect(app).toBeDefined()
    })

    test('accessing non-existent key should fail at compile time', () => {
      const myPlugin = definePlugin({
        id: 'my-plugin',
        context: {} as { myValue: string },
        onRequest: async (c, next) => {
          c.set('myValue', 'hello')
          await next()
        }
      })

      const app = ohnana({ plugins: [myPlugin()] })
      app.get('/test', (c) => {
        // This should NOT compile - expect TypeScript error
        // @ts-expect-error - 'nonExistent' is not a valid context key
        const invalid = c.get('nonExistent')
        
        return c.json({ value: c.get('myValue') })
      })

      expect(app).toBeDefined()
    })
  })

  describe('Plugin Dependencies and Context Merging', () => {
    test('plugin with requires gets combined context from dependencies', () => {
      const pluginA = definePlugin({
        id: 'plugin-a',
        context: {} as { userId: string },
        onRequest: async (c, next) => {
          c.set('userId', 'user-123')
          await next()
        }
      })

      const pluginB = definePlugin({
        id: 'plugin-b',
        requires: [pluginA],
        context: {} as { userName: string },
        onRequest: async (c, next) => {
          // Should have access to userId from pluginA without cast
          const userId: string = c.get('userId')
          c.set('userName', `User ${userId}`)
          await next()
        }
      })

      const app = ohnana({ plugins: [pluginA(), pluginB()] })
      app.get('/test', (c) => {
        // Should have access to both contexts
        const userId: string = c.get('userId')
        const userName: string = c.get('userName')
        
        return c.json({ userId, userName })
      })

      expect(app).toBeDefined()
    })

    test('requestId plugin provides typed context', () => {
      const myPlugin = definePlugin({
        id: 'my-plugin',
        requires: [requestId],
        context: {} as { myData: string },
        onRequest: async (c, next) => {
          // Should have access to requestId without cast
          const id: string = c.get('requestId')
          c.set('myData', `data-${id}`)
          await next()
        }
      })

      const app = ohnana({ plugins: [requestId(), myPlugin()] })
      app.get('/test', (c) => {
        const id: string = c.get('requestId')
        const data: string = c.get('myData')
        
        return c.json({ id, data })
      })

      expect(app).toBeDefined()
    })
  })
})
