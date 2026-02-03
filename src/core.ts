import { Hono } from "hono";
import type { OhnanaConfig, PluginInstance, InferContext, WebSocketData } from "./types";
import { printStartup } from "./banner";

export interface ServeOptions {
  port: number;
  /** WebSocket configuration (optional) */
  websocket?: {
    /** WebSocket handlers from Bun */
    handlers: {
      open?: (ws: any) => void;
      message?: (ws: any, message: string | Buffer) => void;
      close?: (ws: any) => void;
      error?: (ws: any, error: Error) => void;
    };
    /** Path to upgrade to WebSocket (default: '/ws') */
    path?: string;
  };
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

    const wsPath = options.websocket?.path ?? '/ws';
    const honoFetch = this.fetch.bind(this);
    const wsHandlers = options.websocket?.handlers;

    const server = Bun.serve<WebSocketData>({
      port: options.port,
      fetch: options.websocket 
        ? (req, server) => {
            // Check if this is a WebSocket upgrade request
            const url = new URL(req.url);
            if (url.pathname === wsPath && req.headers.get('upgrade') === 'websocket') {
              const id = crypto.randomUUID();
              const upgraded = server.upgrade(req, { data: { id, rooms: new Set<string>() } });
              if (upgraded) return undefined;
              return new Response('WebSocket upgrade failed', { status: 400 });
            }
            // Regular HTTP request - delegate to Hono
            return honoFetch(req);
          }
        : this.fetch,
      websocket: wsHandlers ? {
        open: wsHandlers.open,
        message: wsHandlers.message as any,
        close: wsHandlers.close,
      } : undefined as any,
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
