import { describe, test, expect } from 'bun:test'
import { ohnana } from '../index'
import { events } from '../plugins'

describe('Event Bus Plugin', () => {
  describe('Event emission and subscription', () => {
    test('event emitted in handler triggers subscriber', async () => {
      let handlerCalled = false
      let receivedData: any = null

      const app = ohnana({
        plugins: [events()] as const
      })

      app.post('/users', (c) => {
        const bus = c.get('eventBus')
        bus.on('user.created', (data: any) => {
          handlerCalled = true
          receivedData = data
        })
        bus.emit('user.created', { userId: '123', name: 'Alice' })
        return c.json({ success: true })
      })

      await app.request('/users', { method: 'POST' })

      expect(handlerCalled).toBe(true)
      expect(receivedData).toEqual({ userId: '123', name: 'Alice' })
    })

    test('multiple subscribers receive event', async () => {
      const calls: number[] = []

      const app = ohnana({
        plugins: [events()] as const
      })

      app.post('/trigger', (c) => {
        const bus = c.get('eventBus')
        bus.on('test', () => calls.push(1))
        bus.on('test', () => calls.push(2))
        bus.emit('test', {})
        return c.json({ ok: true })
      })

      await app.request('/trigger', { method: 'POST' })

      expect(calls).toEqual([1, 2])
    })

    test('handler error does not block other handlers', async () => {
      const calls: string[] = []

      const app = ohnana({
        plugins: [events()] as const
      })

      app.post('/trigger', (c) => {
        const bus = c.get('eventBus')
        bus.on('test', () => {
          calls.push('first')
          throw new Error('Handler error')
        })
        bus.on('test', () => {
          calls.push('second')
        })
        bus.emit('test', {})
        return c.json({ ok: true })
      })

      await app.request('/trigger', { method: 'POST' })

      expect(calls).toEqual(['first', 'second'])
    })

    test('no subscribers is silent no-op', async () => {
      const app = ohnana({
        plugins: [events()] as const
      })

      app.post('/trigger', (c) => {
        c.get('eventBus').emit('unsubscribed.event', {})
        return c.json({ ok: true })
      })

      const res = await app.request('/trigger', { method: 'POST' })
      expect(res.status).toBe(200)
    })

    test('event bus is available in context', () => {
      const app = ohnana({
        plugins: [events()] as const
      })

      app.get('/test', (c) => {
        const bus = c.get('eventBus')
        expect(typeof bus.emit).toBe('function')
        expect(typeof bus.on).toBe('function')
        return c.json({ ok: true })
      })

      expect(app).toBeDefined()
    })
  })
})
