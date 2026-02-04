import type { ZodSchema } from 'zod'
import type { PluginInstance } from '../types'

export interface ValidatorConfig<
  TBody extends ZodSchema = ZodSchema,
  TParams extends ZodSchema = ZodSchema,
  TQuery extends ZodSchema = ZodSchema
> {
  body?: TBody
  params?: TParams
  query?: TQuery
}

type InferValidatedContext<
  TBody extends ZodSchema | undefined,
  TParams extends ZodSchema | undefined,
  TQuery extends ZodSchema | undefined
> = (TBody extends ZodSchema ? { validatedBody: TBody['_output'] } : {}) &
    (TParams extends ZodSchema ? { validatedParams: TParams['_output'] } : {}) &
    (TQuery extends ZodSchema ? { validatedQuery: TQuery['_output'] } : {})

export function validator<
  TBody extends ZodSchema = ZodSchema,
  TParams extends ZodSchema = ZodSchema,
  TQuery extends ZodSchema = ZodSchema
>(config: ValidatorConfig<TBody, TParams, TQuery>): PluginInstance<
  InferValidatedContext<TBody, TParams, TQuery>
> {
  return {
    id: 'validator',
    _context: {} as InferValidatedContext<TBody, TParams, TQuery>,
    hooks: {
      onRequest: async (c, next) => {
        if (config.body) {
          const result = config.body.safeParse(await c.req.json())
          if (!result.success) {
            return c.json({
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: result.error.flatten()
            }, 400)
          }
          c.set('validatedBody', result.data)
        }
        
        if (config.params) {
          const result = config.params.safeParse(c.req.param())
          if (!result.success) {
            return c.json({
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: result.error.flatten()
            }, 400)
          }
          c.set('validatedParams', result.data)
        }
        
        if (config.query) {
          const result = config.query.safeParse(c.req.query())
          if (!result.success) {
            return c.json({
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: result.error.flatten()
            }, 400)
          }
          c.set('validatedQuery', result.data)
        }
        
        await next()
      }
    }
  }
}
