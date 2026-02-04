import type { PluginInstance } from '../types'
import { globalLogger } from './logger'

export interface QueueConfig {
  name: string
  isWorker?: boolean
}

export function queue(config: QueueConfig): PluginInstance<{ queue: any }> {
  let queueInstance: any = null

  return {
    id: 'queue',
    _context: {} as { queue: any },
    hooks: {
      onInit: (app) => {
        try {
          const Queue = require('bee-queue')
          queueInstance = new Queue(config.name, {
            redis: Bun.redis,
            isWorker: config.isWorker ?? false
          })
        } catch (err) {
          globalLogger.warn('[Queue] bee-queue not installed. Run: bun add bee-queue')
          queueInstance = null
        }
      },

      onRequest: async (c, next) => {
        if (queueInstance) {
          c.set('queue', queueInstance)
        }
        await next()
      },

      onShutdown: async () => {
        if (queueInstance) {
          await queueInstance.close()
          globalLogger.info('[Queue] Connection closed')
        }
      }
    }
  }
}
