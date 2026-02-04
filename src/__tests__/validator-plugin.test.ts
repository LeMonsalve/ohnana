import { describe, test, expect } from 'bun:test'
import { ohnana } from '../index'
import { validator } from '../plugins/validator'
import { z } from 'zod'

describe('Validator Plugin', () => {
  describe('validatedBody is typed from Zod schema', () => {
    test('validated body has correct type from schema', () => {
      const userSchema = z.object({
        name: z.string(),
        age: z.number()
      })

      const app = ohnana({
        plugins: [validator({ body: userSchema })] as const
      })

      app.post('/users', (c) => {
        const body = c.get('validatedBody')
        const name: string = body.name
        const age: number = body.age
        
        return c.json({ name, age })
      })

      expect(app).toBeDefined()
    })

    test('validated params has correct type', () => {
      const paramsSchema = z.object({
        id: z.string().uuid()
      })

      const app = ohnana({
        plugins: [validator({ params: paramsSchema })] as const
      })

      app.get('/users/:id', (c) => {
        const params = c.get('validatedParams')
        const id: string = params.id
        
        return c.json({ id })
      })

      expect(app).toBeDefined()
    })

    test('validated query has correct type', () => {
      const querySchema = z.object({
        page: z.string(),
        limit: z.string()
      })

      const app = ohnana({
        plugins: [validator({ query: querySchema })] as const
      })

      app.get('/users', (c) => {
        const query = c.get('validatedQuery')
        const page: string = query.page
        const limit: string = query.limit
        
        return c.json({ page, limit })
      })

      expect(app).toBeDefined()
    })
  })

  describe('validator returns PluginInstance', () => {
    test('validator conforms to plugin interface', () => {
      const schema = z.object({ name: z.string() })
      const plugin = validator({ body: schema })
      
      expect(plugin).toHaveProperty('id')
      expect(plugin).toHaveProperty('_context')
      expect(plugin).toHaveProperty('hooks')
      expect(plugin.id).toBe('validator')
    })
  })
})
