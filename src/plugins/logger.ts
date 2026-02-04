import { definePlugin } from '../toolkit'
import { requestId } from './request-id'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
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

function prefix(): string {
  return `${colors.magenta}[Ohnana]${colors.reset}`
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

function createLogger(requestId?: string): Logger {
  const log = (level: string, message: string, meta?: Record<string, unknown>) => {
    const entry = {
      level,
      message,
      ...(requestId && { requestId }),
      ...meta,
      timestamp: new Date().toISOString()
    }
    console.log(JSON.stringify(entry))
  }
  
  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
  }
}

export interface LoggerConfig {
  skip?: (path: string) => boolean
}

export const logger = definePlugin({
  id: 'logger',
  requires: [requestId],
  context: {} as { logger: Logger },

  onRequest: async (c, next) => {
    const reqId = c.get('requestId')
    c.set('logger', createLogger(reqId))
    
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    const status = c.res.status
    const method = c.req.method
    const path = c.req.path

    const icon = getStatusIcon(status)
    const statusColor = getStatusColor(status)

    console.log(
      `${prefix()} ${icon} ${formatMethod(method)} ${formatPath(path)} ${statusColor}${status}${colors.reset}  ${formatMs(ms)}`
    )
  },
})

export { createLogger }

export const globalLogger = createLogger()
