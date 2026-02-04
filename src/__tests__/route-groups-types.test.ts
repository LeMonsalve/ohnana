import { describe, test, expect } from 'bun:test'
import { ohnana } from '../index'
import { definePlugin } from '../toolkit/define-plugin'

describe('Route Groups Type Inference', () => {
  describe('Group plugins context is typed', () => {
    test('route group handler has typed access to group plugin context', () => {
      const appPlugin = definePlugin({
        id: 'app-plugin',
        context: {} as { appValue: string },
        onRequest: async (c, next) => {
          c.set('appValue', 'from-app')
          await next()
        }
      })

      const groupPlugin = definePlugin({
        id: 'group-plugin',
        context: {} as { groupValue: string },
        onRequest: async (c, next) => {
          c.set('groupValue', 'from-group')
          await next()
        }
      })

      const app = ohnana({ plugins: [appPlugin()] })

      app.group('/api', [groupPlugin()] as const, (api) => {
        api.get('/test', (c) => {
          // Should have access to both app and group plugin context
          const appVal: string = c.get('appValue')
          const groupVal: string = c.get('groupValue')
          
          return c.json({ appVal, groupVal })
        })
      })

      expect(app).toBeDefined()
    })

    test('route group without plugins has access to app plugins', () => {
      const appPlugin = definePlugin({
        id: 'app-plugin',
        context: {} as { appValue: string },
        onRequest: async (c, next) => {
          c.set('appValue', 'from-app')
          await next()
        }
      })

      const app = ohnana({ plugins: [appPlugin()] })

      app.group('/api', (api) => {
        api.get('/test', (c) => {
          // Should have access to app plugin context
          const appVal: string = c.get('appValue')
          
          return c.json({ appVal })
        })
      })

      expect(app).toBeDefined()
    })

    test('invalid context key produces TypeScript error', () => {
      const appPlugin = definePlugin({
        id: 'app-plugin',
        context: {} as { appValue: string },
        onRequest: async (c, next) => {
          c.set('appValue', 'from-app')
          await next()
        }
      })

      const app = ohnana({ plugins: [appPlugin()] })

      app.group('/api', (api) => {
        api.get('/test', (c) => {
          // This should NOT compile - expect TypeScript error
          // @ts-expect-error - 'nonExistent' is not a valid context key
          const invalid = c.get('nonExistent')
          
          return c.json({ value: c.get('appValue') })
        })
      })

      expect(app).toBeDefined()
    })

    test('group plugin context not available outside group', () => {
      const groupPlugin = definePlugin({
        id: 'group-plugin',
        context: {} as { groupValue: string },
        onRequest: async (c, next) => {
          c.set('groupValue', 'from-group')
          await next()
        }
      })

      const app = ohnana({ plugins: [] })

      app.group('/api', [groupPlugin()] as const, (api) => {
        api.get('/inside', (c) => {
          const groupVal: string = c.get('groupValue')
          return c.json({ groupVal })
        })
      })

      app.get('/outside', (c) => {
        // This should NOT compile - groupValue only in /api group
        // @ts-expect-error - 'groupValue' is not available outside group
        const invalid = c.get('groupValue')
        
        return c.json({ invalid })
      })

      expect(app).toBeDefined()
    })
  })
})
