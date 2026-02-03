import { definePlugin } from '../toolkit'

export interface RedisConfig {
  url?: string
}

export const redis = definePlugin({
  id: 'redis',
  context: {} as { redis: typeof Bun.redis },
  
  onRequest: async (c, next) => {
    c.set('redis', Bun.redis)
    await next()
  },
  
  onShutdown: async () => {
    console.log('[Redis] Connection closed')
  }
})
