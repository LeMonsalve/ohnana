import type { PluginInstance } from '../types'

export interface DrizzleConfig<TDb> {
  db: TDb
}

export function drizzle<TDb>(
  config: DrizzleConfig<TDb>
): PluginInstance<{ db: TDb }> {
  return {
    id: 'drizzle',
    _context: {} as { db: TDb },
    hooks: {
      onRequest: async (c, next) => {
        (c as any).set('db', config.db)
        await next()
      }
    }
  }
}
