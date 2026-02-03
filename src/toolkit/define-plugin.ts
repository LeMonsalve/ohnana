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
