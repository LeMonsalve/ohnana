import { definePlugin } from '../toolkit'
import { globalLogger } from './logger'

export interface RedisConfig {
  url?: string
}

const redisPlugin = definePlugin({
  id: 'redis',
  context: {} as { redis: typeof Bun.redis },
  
  onRequest: async (c, next) => {
    c.set('redis', Bun.redis)
    await next()
  },
  
  onShutdown: async () => {
    globalLogger.info('[Redis] Connection closed')
  }
})

export const redis = (config?: RedisConfig) => {
  const plugin = redisPlugin(config)
  return {
    ...plugin,
    instance: Bun.redis
  }
}
