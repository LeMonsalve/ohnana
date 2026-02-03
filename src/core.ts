import { Hono } from "hono";
import type { OhnanaConfig, PluginInstance, InferContext } from "./types";
import { printStartup } from "./banner";

export interface ServeOptions {
  port: number;
}

export interface ServeResult {
  port: number;
  fetch: (request: Request) => Response | Promise<Response>;
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

    this.registerPlugins();
  }

  get pluginCount(): number {
    return this.plugins.length;
  }

  serve(options: ServeOptions): ServeResult {
    printStartup({
      port: options.port,
      pluginCount: this.pluginCount,
      startTime: this.startTime,
    });

    return {
      port: options.port,
      fetch: this.fetch,
    };
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
