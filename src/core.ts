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
      
      // Stop accepting new connections
      server.stop();
      
      // Call onShutdown hooks in reverse order (last registered, first to cleanup)
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

  /**
   * Validate that all plugin dependencies are satisfied
   */
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
