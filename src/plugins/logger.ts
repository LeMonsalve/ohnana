import type { MiddlewareHandler } from 'hono'
import { logger as honoLogger } from 'hono/logger'
import { definePlugin } from '../toolkit'

export interface LoggerConfig {
  driver?: MiddlewareHandler
}

export const logger = definePlugin({
  id: 'logger',
  
  onRequest: async (c, next) => {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    console.log(`${c.req.method} ${c.req.path} - ${ms}ms`)
  }
})
