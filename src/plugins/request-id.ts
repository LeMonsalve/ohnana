import type { MiddlewareHandler } from 'hono'
import { requestId as honoRequestId } from 'hono/request-id'
import { definePlugin } from '../toolkit'

export interface RequestIdConfig {
  driver?: MiddlewareHandler
  header?: string
}

export const requestId = definePlugin({
  id: 'requestId',
  context: {} as { requestId: string },
  
  onRequest: async (c, next) => {
    const id = crypto.randomUUID()
    c.set('requestId', id)
    c.header('X-Request-ID', id)
    await next()
  }
})
