import type { PluginInstance } from './plugin'
import type { ServiceInstance } from './service'

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
