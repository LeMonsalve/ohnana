import { Hono } from "hono";
import type { OhnanaConfig, PluginInstance, InferContext } from "./types";
import { printStartup } from "./banner";

export interface ServeOptions {
  port: number;
}

const colors = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
}

export class Ohnana<TPlugins extends readonly PluginInstance<any>[] = readonly []> extends Hono<{
  Variables: InferContext<TPlugins>;
}> {
  private plugins: readonly PluginInstance<any>[];
  private readonly startTime: number;

  constructor(config: OhnanaConfig<TPlugins>) {
    super(config.basePath ? { strict: false } : undefined);

    this.startTime = Date.now();
    this.plugins = config.plugins || ([] as const);

    this.validateDependencies();
    this.registerPlugins();
  }

  get pluginCount(): number {
    return this.plugins.length;
  }

  /**
   * Create a route group with optional additional plugins
   * 
   * @example
   * // With plugins
   * app.group('/api', [auth()], (api) => {
   *   api.get('/me', (c) => c.json({ userId: c.get('userId') }))
   * })
   * 
   * // Without plugins (just grouping)
   * app.group('/admin', (admin) => {
   *   admin.get('/stats', (c) => c.json({ stats: [] }))
   * })
   */
  group<TGroupPlugins extends readonly PluginInstance<any>[]>(
    basePath: string,
    plugins: TGroupPlugins,
    configure: (
      group: Hono<{ Variables: InferContext<TPlugins> & InferContext<TGroupPlugins> }>
    ) => void
  ): this;
  group(
    basePath: string,
    configure: (
      group: Hono<{ Variables: InferContext<TPlugins> }>
    ) => void
  ): this;
  group(
    basePath: string,
    pluginsOrConfigure: readonly PluginInstance<any>[] | ((group: any) => void),
    maybeConfigure?: (group: any) => void
  ): this {
    // Determine if second arg is plugins array or configure function
    const isPluginsArray = Array.isArray(pluginsOrConfigure);
    const plugins = isPluginsArray ? pluginsOrConfigure : [];
    const configFn = isPluginsArray ? maybeConfigure! : pluginsOrConfigure as (group: any) => void;
    
    const subApp = new Hono();
    
    // Register group plugins as middlewares
    for (const plugin of plugins) {
      if (plugin.hooks.onInit) {
        plugin.hooks.onInit(subApp);
      }
      if (plugin.hooks.onRequest) {
        subApp.use('*', plugin.hooks.onRequest as any);
      }
    }
    
    // Let user configure routes
    configFn(subApp);
    
    // Mount sub-app at basePath
    this.route(basePath, subApp);
    
    return this;
  }

  serve(options: ServeOptions) {
    printStartup({
      port: options.port,
      pluginCount: this.pluginCount,
      startTime: this.startTime,
    });

    const server = Bun.serve({
      port: options.port,
      fetch: this.fetch,
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      console.log(`\n${colors.magenta}[Ohnana]${colors.reset} ${colors.yellow}${signal}${colors.reset} received, shutting down...`);
      
      server.stop();
      
      const reversedPlugins = [...this.plugins].reverse();
      for (const plugin of reversedPlugins) {
        if (plugin.hooks.onShutdown) {
          try {
            await plugin.hooks.onShutdown();
            console.log(`${colors.magenta}[Ohnana]${colors.reset} ${colors.dim}↳ ${plugin.id} cleaned up${colors.reset}`);
          } catch (err) {
            console.error(`${colors.magenta}[Ohnana]${colors.reset} ${colors.yellow}↳ ${plugin.id} cleanup failed:${colors.reset}`, err);
          }
        }
      }
      
      console.log(`${colors.magenta}[Ohnana]${colors.reset} ${colors.green}Goodbye!${colors.reset}\n`);
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  }

  private validateDependencies(): void {
    const registeredIds = new Set(this.plugins.map(p => p.id));
    
    for (const plugin of this.plugins) {
      if (plugin._requires) {
        for (const requiredId of plugin._requires) {
          if (!registeredIds.has(requiredId)) {
            throw new Error(
              `Plugin "${plugin.id}" requires "${requiredId}" but it's not registered. ` +
              `Add ${requiredId}() to your plugins array before ${plugin.id}().`
            );
          }
        }
      }
    }
  }

  private registerPlugins(): void {
    for (const plugin of this.plugins) {
      if (plugin.hooks.onInit) {
        plugin.hooks.onInit(this);
      }

      if (plugin.hooks.onRequest) {
        this.use("*", plugin.hooks.onRequest as any);
      }
    }

    if (this.plugins.some((p) => p.hooks.onError)) {
      this.onError((err, c) => {
        for (const plugin of this.plugins) {
          const result = plugin.hooks?.onError?.(err, c as any);
          if (result) return result;
        }
        throw err;
      });
    }
  }
}

export function ohnana<const TPlugins extends readonly PluginInstance<any>[]>(
  config: OhnanaConfig<TPlugins>
): Ohnana<TPlugins> {
  return new Ohnana(config);
}
