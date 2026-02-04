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
    instance: config.db,
    hooks: {
      onRequest: async (c, next) => {
        c.set('db', config.db)
        await next()
      }
    }
  }
}
