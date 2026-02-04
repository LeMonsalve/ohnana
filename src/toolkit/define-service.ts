import type { ServiceDefinition, ServiceInstance, ServiceFactory } from '../types'

export function defineService<
  TId extends string,
  TDeps extends readonly string[] = readonly string[],
  TService = any
>(
  definition: ServiceDefinition<TId, TDeps, TService>
): ServiceFactory<TService> {
  return (config?: any) => ({
    id: definition.id,
    _service: {} as TService,
    _dependencies: definition.dependencies,
    definition: {
      ...definition,
      create: (deps: any) => definition.create(deps),
    },
  } as ServiceInstance<TService>)
}
