import type { MiddlewareHandler } from 'hono'
import type { PluginDefinition, PluginInstance } from './types'

export function definePlugin<
  TConfig = void,
  TContext extends Record<string, unknown> = {}
>(
  definition: PluginDefinition<TConfig, TContext>
): (config?: TConfig) => PluginInstance<TContext> {
  return (config?: TConfig) => ({
    id: definition.id,
    _context: {} as TContext,
    hooks: {
      onInit: definition.onInit,
      onRequest: definition.onRequest,
      onResponse: definition.onResponse,
      onError: definition.onError,
      onShutdown: definition.onShutdown,
    },
    config,
  } as PluginInstance<TContext> & { config?: TConfig });
}

let middlewareCounter = 0

export function fromMiddleware<TContext extends Record<string, unknown> = {}>(
  middleware: MiddlewareHandler,
  options?: { id?: string; context?: TContext }
): PluginInstance<TContext> {
  const id = options?.id ?? `middleware-${++middlewareCounter}`
  
  return {
    id,
    _context: {} as TContext,
    hooks: {
      onRequest: middleware as any,
    },
  }
}
