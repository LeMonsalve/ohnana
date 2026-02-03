import { cors as honoCors } from 'hono/cors'
import { definePlugin } from '../toolkit'

export interface CorsConfig {
  origin?: string | string[]
  methods?: string[]
  headers?: string[]
  credentials?: boolean
}

export const cors = definePlugin({
  id: 'cors',
  
  onInit: (app) => {
    app.use('*', honoCors({
      origin: '*'
    }))
  }
})
