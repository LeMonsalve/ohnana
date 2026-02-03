import { Hono } from "hono";
import type { OhnanaConfig, PluginInstance, InferContext } from "./types";

export class Ohnana<TPlugins extends readonly PluginInstance<any>[] = readonly []> extends Hono<{
  Variables: InferContext<TPlugins>;
}> {
  private plugins: readonly PluginInstance<any>[];

  constructor(config: OhnanaConfig<TPlugins>) {
    super(config.basePath ? { strict: false } : undefined);

    this.plugins = config.plugins || ([] as const);

    this.registerPlugins();
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
