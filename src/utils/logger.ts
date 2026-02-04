import { colors } from './colors'

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export interface LoggerConfig {
  format?: 'json' | 'pretty' | 'auto'
}

type LogFormat = 'json' | 'pretty'

function detectFormat(config?: LoggerConfig): LogFormat {
  if (config?.format && config.format !== 'auto') {
    return config.format
  }

  if (process.env.LOG_FORMAT === 'json' || process.env.LOG_FORMAT === 'pretty') {
    return process.env.LOG_FORMAT
  }

  if (process.env.NODE_ENV === 'production') {
    return 'json'
  }

  if (process.env.NODE_ENV === 'development') {
    return 'pretty'
  }

  return process.stdout.isTTY ? 'pretty' : 'json'
}

function formatPretty(level: string, message: string, meta?: Record<string, unknown>): string {
  const levelColors: Record<string, string> = {
    debug: colors.gray,
    info: colors.cyan,
    warn: colors.yellow,
    error: colors.red,
  }

  const color = levelColors[level] || colors.white
  const levelTag = `${color}[${level.toUpperCase()}]${colors.reset}`
  
  const metaStr = meta && Object.keys(meta).length > 0
    ? ` ${colors.dim}${JSON.stringify(meta)}${colors.reset}`
    : ''

  return `${levelTag} ${message}${metaStr}`
}

function formatJSON(level: string, message: string, meta?: Record<string, unknown>): string {
  const entry = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString()
  }
  return JSON.stringify(entry)
}

export function createLogger(config?: LoggerConfig): Logger {
  const format = detectFormat(config)

  const log = (level: string, message: string, meta?: Record<string, unknown>) => {
    const output = format === 'json'
      ? formatJSON(level, message, meta)
      : formatPretty(level, message, meta)
    
    console.log(output)
  }

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
  }
}
