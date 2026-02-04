import type { ServiceInstance } from './types'

export class ServiceContainer {
  private services = new Map<string, any>()
  private instances = new Map<string, ServiceInstance<any>>()
  
  register(service: ServiceInstance<any>): void {
    if (this.instances.has(service.id)) {
      throw new Error(`Service "${service.id}" is already registered`)
    }
    this.instances.set(service.id, service)
  }
  
  validateDependencies(pluginIds: Set<string>): void {
    const serviceIds = new Set(Array.from(this.instances.keys()))
    const allIds = new Set([...pluginIds, ...serviceIds])
    
    for (const [id, instance] of this.instances) {
      if (!instance._dependencies) continue
      
      for (const depId of instance._dependencies) {
        if (!allIds.has(depId)) {
          throw new Error(
            `Service "${id}" requires "${depId}" but it's not registered. ` +
            `Add ${depId}() to your plugins or services array before ${id}().`
          )
        }
      }
    }
    
    this.detectCycles()
  }
  
  private detectCycles(): void {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const visit = (serviceId: string, path: string[]): void => {
      if (recursionStack.has(serviceId)) {
        const cycle = [...path, serviceId].join(' → ')
        throw new Error(`Circular dependency detected: ${cycle}`)
      }
      
      if (visited.has(serviceId)) return
      
      visited.add(serviceId)
      recursionStack.add(serviceId)
      
      const instance = this.instances.get(serviceId)
      if (instance?._dependencies) {
        for (const depId of instance._dependencies) {
          if (this.instances.has(depId)) {
            visit(depId, [...path, serviceId])
          }
        }
      }
      
      recursionStack.delete(serviceId)
    }
    
    for (const serviceId of this.instances.keys()) {
      visit(serviceId, [])
    }
  }
  
  async initialize(pluginContext: Record<string, unknown>): Promise<void> {
    for (const [id, instance] of this.instances) {
      const deps = this.buildDeps(instance._dependencies || [], pluginContext)
      
      if (instance.definition.onInit) {
        await instance.definition.onInit(deps)
      }
      
      const service = instance.definition.create(deps)
      this.services.set(id, service)
    }
  }
  
  private buildDeps(
    dependencies: readonly string[],
    pluginContext: Record<string, unknown>
  ): Record<string, unknown> {
    const deps: Record<string, unknown> = {}
    
    for (const depId of dependencies) {
      if (pluginContext[depId] !== undefined) {
        deps[depId] = pluginContext[depId]
      } else if (this.services.has(depId)) {
        deps[depId] = this.services.get(depId)
      } else {
        throw new Error(`Dependency "${depId}" not found`)
      }
    }
    
    return deps
  }
  
  get<T>(id: string): T {
    const service = this.services.get(id)
    if (!service) {
      throw new Error(`Service "${id}" not found`)
    }
    return service as T
  }
  
  async shutdown(): Promise<void> {
    const reversed = Array.from(this.instances.entries()).reverse()
    
    for (const [id, instance] of reversed) {
      if (instance.definition.onShutdown) {
        try {
          await instance.definition.onShutdown()
        } catch (err) {
          console.error(`Service "${id}" shutdown failed:`, err)
        }
      }
    }
  }
}
