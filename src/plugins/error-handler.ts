import { HTTPException } from 'hono/http-exception'
import { definePlugin } from '../toolkit'
import { ErrorCodes } from '../types'

export interface ErrorHandlerConfig {
  includeStack?: boolean
}

function getErrorCode(status: number): string {
  switch (status) {
    case 400: return ErrorCodes.BAD_REQUEST
    case 401: return ErrorCodes.UNAUTHORIZED
    case 403: return ErrorCodes.FORBIDDEN
    case 404: return ErrorCodes.NOT_FOUND
    default: return ErrorCodes.INTERNAL_ERROR
  }
}

export const errorHandler = definePlugin({
  id: 'errorHandler',
  
  onError: (error, c) => {
    const requestId = c.get('requestId')
    
    if (error instanceof HTTPException) {
      return c.json({
        message: error.message,
        code: getErrorCode(error.status),
        requestId,
      }, error.status)
    }
    
    return c.json({
      message: 'Internal Server Error',
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
    }, 500)
  },
  
  onInit: (app) => {
    app.notFound((c: any) => {
      return c.json({
        message: 'Not Found',
        code: ErrorCodes.NOT_FOUND,
        requestId: c.get('requestId'),
      }, 404)
    })
  }
})
