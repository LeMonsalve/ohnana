import type { Context } from 'hono'
import { definePlugin } from '../toolkit'
import { colors, prefix as getPrefix, createLogger, type Logger } from '../utils'

function tryGet<T>(c: Context, key: string): T | undefined {
  try {
    return c.get(key)
  } catch {
    return undefined
  }
}

const methodColors: Record<string, string> = {
  GET: colors.cyan,
  POST: colors.green,
  PUT: colors.yellow,
  PATCH: colors.yellow,
  DELETE: colors.red,
}

function getStatusIcon(status: number): string {
  if (status >= 500) return `${colors.red}✗${colors.reset}`
  if (status >= 400) return `${colors.red}✗${colors.reset}`
  if (status >= 300) return `${colors.yellow}⚠${colors.reset}`
  return `${colors.green}✓${colors.reset}`
}

function getStatusColor(status: number): string {
  if (status >= 500) return colors.red
  if (status >= 400) return colors.red
  if (status >= 300) return colors.yellow
  return colors.green
}

function formatMethod(method: string): string {
  const color = methodColors[method] || colors.white
  return `${color}${method.padEnd(7)}${colors.reset}`
}

function formatPath(path: string): string {
  return path.length > 20 ? path.substring(0, 20) + '...' : path.padEnd(23)
}

function formatMs(ms: number): string {
  return `${colors.dim}${ms.toString().padStart(4)}ms${colors.reset}`
}

export interface LoggerConfig {
  skip?: (path: string) => boolean
}

export const logger = definePlugin({
  id: 'logger',
  context: {} as { logger: Logger },

  onRequest: async (c, next) => {
    const reqId = tryGet<string>(c, 'requestId')
    const baseLogger = createLogger()
    
    const loggerWithRequestId: Logger = {
      debug: (msg, meta) => baseLogger.debug(msg, { ...meta, ...(reqId && { requestId: reqId }) }),
      info: (msg, meta) => baseLogger.info(msg, { ...meta, ...(reqId && { requestId: reqId }) }),
      warn: (msg, meta) => baseLogger.warn(msg, { ...meta, ...(reqId && { requestId: reqId }) }),
      error: (msg, meta) => baseLogger.error(msg, { ...meta, ...(reqId && { requestId: reqId }) }),
    }
    
    c.set('logger', loggerWithRequestId)
    
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    const status = c.res.status
    const method = c.req.method
    const path = c.req.path

    const icon = getStatusIcon(status)
    const statusColor = getStatusColor(status)

    console.log(
      `${getPrefix()} ${icon} ${formatMethod(method)} ${formatPath(path)} ${statusColor}${status}${colors.reset}  ${formatMs(ms)}`
    )
  },
})
