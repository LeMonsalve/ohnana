import { describe, test, expect } from 'bun:test'
import { ohnana, type ErrorContext } from '../index'
import { definePlugin } from '../toolkit/define-plugin'
import { requestId } from '../plugins/request-id'

describe('Error Context Enhancement', () => {
  describe('Error hook receives ErrorContext', () => {
    test('error hook receives pluginId when plugin throws', async () => {
      let capturedContext: any = null

      const throwingPlugin = definePlugin({
        id: 'throwing-plugin',
        context: {} as {},
        onRequest: async () => {
          throw new Error('Test error')
        }
      })

      const errorCapturePlugin = definePlugin({
        id: 'error-capture',
        context: {} as {},
        onError: (error: Error, c: any, context: ErrorContext) => {
          capturedContext = context
          return c.json({ error: 'captured' }, 500)
        }
      })

      const app = ohnana({
        plugins: [throwingPlugin(), errorCapturePlugin()] as const
      })

      app.get('/test', (c) => c.json({ ok: true }))

      await app.request('/test')

      expect(capturedContext).toBeDefined()
      expect(capturedContext.pluginId).toBe('throwing-plugin')
    })

    test('error hook receives stage information', async () => {
      let capturedContext: any = null

      const errorCapturePlugin = definePlugin({
        id: 'error-capture',
        context: {} as {},
        onError: (error: Error, c: any, context: ErrorContext) => {
          capturedContext = context
          return c.json({ error: 'captured' }, 500)
        }
      })

      const app = ohnana({
        plugins: [errorCapturePlugin()] as const
      })

      app.get('/test', () => {
        throw new Error('Handler error')
      })

      await app.request('/test')

      expect(capturedContext).toBeDefined()
      expect(capturedContext.stage).toBe('handler')
    })

    test('ErrorContext includes plugin list', async () => {
      let capturedContext: any = null

      const plugin1 = definePlugin({
        id: 'plugin-1',
        context: {} as {}
      })

      const plugin2 = definePlugin({
        id: 'plugin-2',
        context: {} as {}
      })

      const errorCapturePlugin = definePlugin({
        id: 'error-capture',
        context: {} as {},
        onError: (error: Error, c: any, context: ErrorContext) => {
          capturedContext = context
          return c.json({ error: 'captured' }, 500)
        }
      })

      const app = ohnana({
        plugins: [plugin1(), plugin2(), errorCapturePlugin()] as const
      })

      app.get('/test', () => {
        throw new Error('Test error')
      })

      await app.request('/test')

      expect(capturedContext).toBeDefined()
      expect(capturedContext.pluginList).toEqual(['plugin-1', 'plugin-2', 'error-capture'])
    })

    test('error in onRequest middleware has correct stage', async () => {
      let capturedContext: any = null

      const middlewarePlugin = definePlugin({
        id: 'middleware-plugin',
        context: {} as {},
        onRequest: async () => {
          throw new Error('Middleware error')
        }
      })

      const errorCapturePlugin = definePlugin({
        id: 'error-capture',
        context: {} as {},
        onError: (error: Error, c: any, context: ErrorContext) => {
          capturedContext = context
          return c.json({ error: 'captured' }, 500)
        }
      })

      const app = ohnana({
        plugins: [middlewarePlugin(), errorCapturePlugin()] as const
      })

      app.get('/test', (c) => c.json({ ok: true }))

      await app.request('/test')

      expect(capturedContext).toBeDefined()
      expect(capturedContext.stage).toBe('middleware')
      expect(capturedContext.pluginId).toBe('middleware-plugin')
    })
  })
})
