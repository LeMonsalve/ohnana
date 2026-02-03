import type { Context, Next } from 'hono'

/**
 * Plugin hooks - lifecycle events
 */
export interface PluginHooks<TContext extends Record<string, unknown> = {}> {
  /** Called when plugin is registered in UHono */
  onInit?: (app: any) => void;
  
  /** Called before each request (middleware) */
  onRequest?: (c: Context & { Variables: TContext }, next: Next) => Promise<void | Response>;
  
  /** Called after response is generated */
  onResponse?: (c: Context & { Variables: TContext }, response: Response) => Response | void;
  
  /** Called when an error occurs */
  onError?: (error: Error, c: Context & { Variables: TContext }) => Response | void;
  
  /** Called when app is shutting down */
  onShutdown?: () => Promise<void> | void;
}

/**
 * Plugin definition - what definePlugin() accepts
 */
export interface PluginDefinition<
  TConfig = void,
  TContext extends Record<string, unknown> = {}
> extends PluginHooks<TContext> {
  id: string;
  
  // Phantom type for context inference
  // Usage: context: {} as { requestId: string }
  context?: TContext;
}

/**
 * Plugin instance - what plugins return after config
 */
export interface PluginInstance<TContext extends Record<string, unknown> = {}> {
  id: string;
  _context: TContext; // Phantom for type inference
  hooks: PluginHooks<TContext>;
}

/**
 * UHono config - constructor options
 */
export interface UHonoConfig<TPlugins extends PluginInstance<any>[] = []> {
  plugins?: TPlugins;
  basePath?: string;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  message: string;
  code: string;           // SCREAMING_SNAKE_CASE: NOT_FOUND, INTERNAL_ERROR
  details?: Record<string, unknown>;
  requestId?: string;     // If requestId plugin is active
}

/**
 * Error codes enum
 */
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

/**
 * Infer combined context from all plugins
 */
export type InferContext<TPlugins extends PluginInstance<any>[]> = 
  TPlugins extends [infer First extends PluginInstance<any>, ...infer Rest extends PluginInstance<any>[]]
    ? First['_context'] & InferContext<Rest>
    : {};
