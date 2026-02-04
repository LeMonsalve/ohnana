import type { MiddlewareHandler } from 'hono'
import type { PluginDefinition, PluginInstance, PluginFactory, CombineRequiredContexts } from '../types'

/**
 * Define a plugin with full type inference
 */
export function definePlugin<
  TConfig = void,
  TContext extends Record<string, unknown> = {},
  const TRequires extends readonly PluginFactory<any, any>[] = readonly []
>(
  definition: PluginDefinition<TConfig, TContext, TRequires>
): PluginFactory<TContext, CombineRequiredContexts<TRequires>> {
  // Extract required plugin IDs for runtime validation
  const requiredIds = definition.requires?.map(factory => {
    // Call the factory to get the plugin instance and extract its ID
    const instance = factory()
    return instance.id
  }) ?? []

  return (config?: TConfig) => ({
    id: definition.id,
    _context: {} as TContext,
    _requires: requiredIds.length > 0 ? requiredIds : undefined,
    hooks: {
      onInit: definition.onInit,
      onRequest: definition.onRequest,
      onResponse: definition.onResponse,
      onError: definition.onError,
      onShutdown: definition.onShutdown,
    },
    config,
  } as PluginInstance<TContext, CombineRequiredContexts<TRequires>> & { config?: TConfig })
}

let middlewareCounter = 0

/**
 * Wrap a Hono middleware as an Ohnana plugin
 */
export function fromMiddleware<TContext extends Record<string, unknown> = {}>(
  middleware: MiddlewareHandler,
  options?: { id?: string; context?: TContext }
): PluginInstance<TContext, {}> {
  const id = options?.id ?? `middleware-${++middlewareCounter}`
  
  return {
    id,
    _context: {} as TContext,
    hooks: {
      onRequest: middleware,
    },
  }
}
