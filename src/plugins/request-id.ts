import { definePlugin } from '../toolkit'

export interface RequestIdConfig {
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
