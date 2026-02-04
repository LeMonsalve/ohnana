// ============================================
// Service Types (Dependency Injection)
// ============================================

/**
 * A service factory function that creates service instances
 */
export type ServiceFactory<TService = any, TId extends string = string> = 
  (config?: any) => ServiceInstance<TService, TId>

/**
 * Service definition - what defineService() accepts
 */
export interface ServiceDefinition<
  TId extends string = string,
  TDeps extends readonly string[] = readonly string[],
  TService = any
> {
  id: TId
  
  /** Service dependencies - array of plugin/service IDs */
  dependencies?: TDeps
  
  /** Called when service is initialized (before create) */
  onInit?: (deps: any) => Promise<void> | void
  
  /** Factory function that creates the service instance */
  create: (deps: any) => TService
  
  /** Called when app is shutting down */
  onShutdown?: () => Promise<void> | void
}

/**
 * Service instance - what services return after registration
 */
export interface ServiceInstance<TService = any, TId extends string = string> {
  id: TId
  _service: TService
  _dependencies?: readonly string[]
  definition: ServiceDefinition<TId, any, TService>
}

/**
 * Infer service dependencies type from dependency array
 */
export type InferServiceDeps<
  TDeps extends readonly string[],
  TPluginContext extends Record<string, unknown> = {},
  TServiceContext extends Record<string, unknown> = {}
> = {
  [K in TDeps[number]]: K extends keyof TPluginContext 
    ? TPluginContext[K]
    : K extends keyof TServiceContext
      ? TServiceContext[K]
      : unknown
}

/**
 * Infer combined service context from all services
 */
export type InferServiceContext<TServices extends readonly ServiceInstance<any, any>[]> = 
  TServices extends readonly [infer First, ...infer Rest]
    ? (First extends ServiceInstance<infer S, infer Id extends string> ? { [K in Id]: S } : {}) & 
      (Rest extends readonly ServiceInstance<any, any>[] ? InferServiceContext<Rest> : {})
    : {}
