import type { Context, Next } from 'hono'

/**
 * Error context provided to onError hooks
 */
export interface ErrorContext {
  /** ID of the plugin that threw the error (if identifiable) */
  pluginId?: string
  /** Stage where the error occurred */
  stage: 'middleware' | 'handler' | 'response'
  /** List of all registered plugin IDs */
  pluginList: string[]
}

/**
 * A plugin factory function that creates plugin instances
 */
export type PluginFactory<
  TContext extends Record<string, unknown> = {},
  TRequired extends Record<string, unknown> = {}
> = (config?: any) => PluginInstance<TContext, TRequired>

/**
 * Extract context type from a plugin factory
 */
export type ExtractPluginContext<T> = 
  T extends PluginFactory<infer C> ? C : 
  T extends () => PluginInstance<infer C> ? C : {}

/**
 * Combine contexts from multiple plugin factories
 */
export type CombineRequiredContexts<T extends readonly PluginFactory<any, any>[]> = 
  T extends readonly [infer First, ...infer Rest]
    ? ExtractPluginContext<First> & 
      (Rest extends readonly PluginFactory<any, any>[] ? CombineRequiredContexts<Rest> : {})
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
    c: Context<{ Variables: TRequired & TContext }>,
    context: ErrorContext
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
  TRequires extends readonly PluginFactory<any, any>[] = readonly []
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
    c: Context<{ Variables: CombineRequiredContexts<TRequires> & TContext }>,
    context: ErrorContext
  ) => Response | void;
  
  /** Called on shutdown */
  onShutdown?: () => Promise<void> | void;
}

/**
 * Plugin instance - what plugins return after config
 */
export interface PluginInstance<
  TContext extends Record<string, unknown> = {},
  TRequired extends Record<string, unknown> = {}
> {
  id: string;
  _context: TContext;
  _requires?: readonly string[];
  hooks: PluginHooks<TContext, TRequired>;
  instance?: unknown;
}

/**
 * Ohnana config - constructor options
 */
export interface OhnanaConfig<
  TPlugins extends readonly PluginInstance<any, any>[] = readonly [],
  TServices extends readonly ServiceInstance<any, any>[] = readonly []
> {
  plugins?: TPlugins;
  services?: TServices;
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
export type InferContext<TPlugins extends readonly PluginInstance<any, any>[]> = 
  TPlugins extends readonly [infer First, ...infer Rest]
    ? (First extends PluginInstance<infer C, any> ? C : {}) & 
      (Rest extends readonly PluginInstance<any, any>[] ? InferContext<Rest> : {})
    : {};

// ============================================
// WebSocket Types
// ============================================

/**
 * WebSocket plugin configuration
 */
export interface WebSocketConfig {
  /** WebSocket endpoint path (default: '/ws') */
  path?: string;
  /** Called when a client connects */
  onOpen?: (ws: WebSocketClient) => void;
  /** Called when a message is received */
  onMessage?: (ws: WebSocketClient, message: WebSocketMessage) => void;
  /** Called when a client disconnects */
  onClose?: (ws: WebSocketClient) => void;
  /** Called when an error occurs */
  onError?: (ws: WebSocketClient, error: Error) => void;
}

/**
 * WebSocket client wrapper for type-safe operations
 */
export interface WebSocketClient {
  /** Unique client identifier */
  readonly id: string;
  /** Send JSON data to this client */
  send(data: unknown): void;
  /** Join a room/channel */
  join(room: string): void;
  /** Leave a room/channel */
  leave(room: string): void;
  /** Get rooms this client is in */
  readonly rooms: ReadonlySet<string>;
  /** Close the connection */
  close(): void;
  /** Raw Bun ServerWebSocket (for advanced use) */
  readonly raw: unknown;
}

/**
 * WebSocket server interface for broadcasting and room management
 * Available in HTTP routes via c.get('ws')
 */
export interface WebSocketServer {
  /** Broadcast to all clients in a room */
  broadcast(room: string, data: unknown): void;
  /** Broadcast to all connected clients */
  broadcastAll(data: unknown): void;
  /** Get all clients in a room */
  clients(room?: string): ReadonlySet<WebSocketClient>;
  /** Get count of connected clients */
  readonly clientCount: number;
}

/**
 * WebSocket message protocol (JSON)
 */
export interface WebSocketMessage<T = unknown> {
  /** Action type: 'join', 'leave', 'broadcast', or custom */
  action: string;
  /** Target room for join/leave/broadcast actions */
  room?: string;
  /** Message payload */
  data?: T;
}

/**
 * Internal WebSocket data attached to each connection
 */
export interface WebSocketData {
  id: string;
  rooms: Set<string>;
}

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
