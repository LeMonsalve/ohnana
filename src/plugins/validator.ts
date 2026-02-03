import type { Context, Next } from 'hono'
import type { ZodSchema } from 'zod'

export interface ValidatorConfig<
  TBody extends ZodSchema = ZodSchema,
  TParams extends ZodSchema = ZodSchema,
  TQuery extends ZodSchema = ZodSchema
> {
  body?: TBody
  params?: TParams
  query?: TQuery
}

export function validator<
  TBody extends ZodSchema = ZodSchema,
  TParams extends ZodSchema = ZodSchema,
  TQuery extends ZodSchema = ZodSchema
>(config: ValidatorConfig<TBody, TParams, TQuery>) {
  return async (c: Context, next: Next) => {
    if (config.body) {
      const result = config.body.safeParse(await (c as any).req.json())
      if (!result.success) {
        return (c as any).json({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: result.error.flatten()
        }, 400)
      }
      (c as any).set('validatedBody', result.data)
    }
    
    if (config.params) {
      const result = config.params.safeParse((c as any).req.param())
      if (!result.success) {
        return (c as any).json({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: result.error.flatten()
        }, 400)
      }
      (c as any).set('validatedParams', result.data)
    }
    
    if (config.query) {
      const result = config.query.safeParse((c as any).req.query())
      if (!result.success) {
        return (c as any).json({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: result.error.flatten()
        }, 400)
      }
      (c as any).set('validatedQuery', result.data)
    }
    
    await next()
  }
}
