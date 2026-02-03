import type { Context, Next } from 'hono'

/**
 * A plugin factory function that creates plugin instances
 */
export type PluginFactory<TContext extends Record<string, unknown> = {}> = 
  (config?: any) => PluginInstance<TContext>

/**
 * Extract context type from a plugin factory
 */
export type ExtractPluginContext<T> = 
  T extends PluginFactory<infer C> ? C : 
  T extends () => PluginInstance<infer C> ? C : {}

/**
 * Combine contexts from multiple plugin factories
 */
export type CombineRequiredContexts<T extends readonly PluginFactory<any>[]> = 
  T extends readonly [infer First, ...infer Rest]
    ? ExtractPluginContext<First> & 
      (Rest extends readonly PluginFactory<any>[] ? CombineRequiredContexts<Rest> : {})
    : {}

/**
 * Plugin hooks - lifecycle events
 * TContext = own context, TRequired = context from dependencies
 */
export interface PluginHooks<
  TContext extends Record<string, unknown> = {},
  TRequired extends Record<string, unknown> = {}
> {
  /** Called when plugin is registered in Ohnana */
  onInit?: (app: any) => void;
  
  /** Called before each request (middleware) */
  onRequest?: (
    c: Context<{ Variables: TRequired & TContext }>, 
    next: Next
  ) => Promise<void | Response>;
  
  /** Called after response is generated */
  onResponse?: (
    c: Context<{ Variables: TRequired & TContext }>, 
    response: Response
  ) => Response | void;
  
  /** Called when an error occurs */
  onError?: (
    error: Error, 
    c: Context<{ Variables: TRequired & TContext }>
  ) => Response | void;
  
  /** Called when app is shutting down */
  onShutdown?: () => Promise<void> | void;
}

/**
 * Plugin definition - what definePlugin() accepts
 */
export interface PluginDefinition<
  TConfig = void,
  TContext extends Record<string, unknown> = {},
  TRequires extends readonly PluginFactory<any>[] = readonly []
> {
  id: string;
  
  /** Plugin dependencies - array of plugin factories */
  requires?: TRequires;
  
  /** Phantom type for context inference */
  context?: TContext;
  
  /** Called when plugin is registered */
  onInit?: (app: any) => void;
  
  /** Called before each request */
  onRequest?: (
    c: Context<{ Variables: CombineRequiredContexts<TRequires> & TContext }>, 
    next: Next
  ) => Promise<void | Response>;
  
  /** Called after response */
  onResponse?: (
    c: Context<{ Variables: CombineRequiredContexts<TRequires> & TContext }>, 
    response: Response
  ) => Response | void;
  
  /** Called on error */
  onError?: (
    error: Error, 
    c: Context<{ Variables: CombineRequiredContexts<TRequires> & TContext }>
  ) => Response | void;
  
  /** Called on shutdown */
  onShutdown?: () => Promise<void> | void;
}

/**
 * Plugin instance - what plugins return after config
 */
export interface PluginInstance<TContext extends Record<string, unknown> = {}> {
  id: string;
  _context: TContext;
  _requires?: readonly string[];  // Store required plugin IDs for runtime validation
  hooks: PluginHooks<TContext, any>;
}

/**
 * Ohnana config - constructor options
 */
export interface OhnanaConfig<TPlugins extends readonly PluginInstance<any>[] = readonly []> {
  plugins?: TPlugins;
  basePath?: string;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  message: string;
  code: string;
  details?: Record<string, unknown>;
  requestId?: string;
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
export type InferContext<TPlugins extends readonly PluginInstance<any>[]> = 
  TPlugins extends readonly [infer First, ...infer Rest]
    ? (First extends PluginInstance<infer C> ? C : {}) & 
      (Rest extends readonly PluginInstance<any>[] ? InferContext<Rest> : {})
    : {};
