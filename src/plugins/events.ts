import { definePlugin } from '../toolkit'
import { createLogger } from '../utils/logger'

const logger = createLogger()

export interface EventBus {
  emit(event: string, data: any): void
  on(event: string, handler: (data: any) => any): void
  off(event: string, handler: (data: any) => any): void
}

class EventBusImpl implements EventBus {
  private handlers = new Map<string, Set<(data: any) => any>>()

  emit(event: string, data: any): void {
    const eventHandlers = this.handlers.get(event)
    if (!eventHandlers || eventHandlers.size === 0) {
      return
    }

    for (const handler of eventHandlers) {
      try {
        const result = handler(data)
        if (result instanceof Promise) {
          result.catch((err) => {
            logger.error(`[EventBus] Handler error for event "${event}":`, err as any)
          })
        }
      } catch (err) {
        logger.error(`[EventBus] Handler error for event "${event}":`, err as any)
      }
    }
  }

  on(event: string, handler: (data: any) => any): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  off(event: string, handler: (data: any) => any): void {
    this.handlers.get(event)?.delete(handler)
    if (this.handlers.get(event)?.size === 0) {
      this.handlers.delete(event)
    }
  }
}

const globalEventBus = new EventBusImpl()

export const events = definePlugin({
  id: 'events',
  context: {} as { eventBus: EventBus },
  
  onInit: (app) => {
    (app as any).get = (key: string) => {
      if (key === 'eventBus') return globalEventBus
      return undefined
    }
  },
  
  onRequest: async (c, next) => {
    c.set('eventBus', globalEventBus)
    await next()
  }
})
