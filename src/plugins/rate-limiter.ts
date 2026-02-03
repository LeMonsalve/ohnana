import type { Context } from 'hono'
import type { PluginInstance } from '../types'

export interface RateLimiterConfig {
  /** Time window in milliseconds (default: 60000 = 1 min) */
  windowMs?: number
  /** Max requests per window (default: 100) */
  max?: number
  /** Custom key generator (default: IP address) */
  keyGenerator?: (c: Context) => string
  /** Skip rate limiting for certain requests */
  skip?: (c: Context) => boolean
  /** Custom error message */
  message?: string
}

interface RateLimitRecord {
  count: number
  resetAt: number
}

// In-memory store (can be extended to Redis later)
const store = new Map<string, RateLimitRecord>()

function getClientIP(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  )
}

export function rateLimiter(config?: RateLimiterConfig): PluginInstance<{}> {
  const windowMs = config?.windowMs ?? 60_000
  const max = config?.max ?? 100
  const message = config?.message ?? 'Too many requests, please try again later'
  
  return {
    id: 'rateLimiter',
    _context: {},
    hooks: {
      onRequest: async (c, next) => {
        // Skip if configured
        if (config?.skip?.(c as any)) {
          return next()
        }
        
        const key = config?.keyGenerator?.(c as any) ?? getClientIP(c as any)
        const now = Date.now()
        const record = store.get(key)
        
        // Clean up expired entries periodically
        if (Math.random() < 0.01) {
          for (const [k, v] of store) {
            if (now > v.resetAt) store.delete(k)
          }
        }
        
        // New window or expired
        if (!record || now > record.resetAt) {
          store.set(key, { count: 1, resetAt: now + windowMs })
          return next()
        }
        
        // Within window, check limit
        if (record.count >= max) {
          const retryAfter = Math.ceil((record.resetAt - now) / 1000)
          
          ;(c as any).header('Retry-After', retryAfter.toString())
          ;(c as any).header('X-RateLimit-Limit', max.toString())
          ;(c as any).header('X-RateLimit-Remaining', '0')
          ;(c as any).header('X-RateLimit-Reset', record.resetAt.toString())
          
          return (c as any).json({ message, retryAfter }, 429)
        }
        
        // Increment and continue
        record.count++
        
        ;(c as any).header('X-RateLimit-Limit', max.toString())
        ;(c as any).header('X-RateLimit-Remaining', (max - record.count).toString())
        ;(c as any).header('X-RateLimit-Reset', record.resetAt.toString())
        
        return next()
      },
    },
  }
}
