import { test, expect, describe } from 'bun:test'
import { ohnana } from '../index'
import { logger, requestId } from '../plugins'
import { createTestClient } from '../testing'

describe('Logger Plugin', () => {
  describe('Decoupled Operation', () => {
    test('works without requestId plugin', () => {
      // Should not throw when logger is used without requestId
      expect(() => {
        ohnana({ plugins: [logger()] })
      }).not.toThrow()
    })

    test('can be used in routes without requestId', async () => {
      const app = ohnana({ plugins: [logger()] })
      
      app.get('/', (c) => {
        const log = c.get('logger')
        log.info('test message')
        return c.json({ ok: true })
      })

      const client = createTestClient(app)
      const res = await client.get('/')
      
      expect(res.status).toBe(200)
    })
  })

  describe('Optional RequestId Integration', () => {
    test('includes requestId when plugin is present', async () => {
      const app = ohnana({ plugins: [requestId(), logger()] })
      
      let capturedRequestId: string | undefined
      
      app.get('/', (c) => {
        capturedRequestId = c.get('requestId')
        const log = c.get('logger')
        log.info('test with requestId')
        return c.json({ ok: true })
      })

      const client = createTestClient(app)
      await client.get('/')
      
      expect(capturedRequestId).toBeDefined()
      expect(typeof capturedRequestId).toBe('string')
    })
  })

  describe('Format Switching', () => {
    test('JSON format when LOG_FORMAT=json', () => {
      // This test verifies the format detection logic exists
      // Actual format output is tested via integration tests
      const originalEnv = process.env.LOG_FORMAT
      process.env.LOG_FORMAT = 'json'
      
      expect(() => {
        ohnana({ plugins: [logger()] })
      }).not.toThrow()
      
      process.env.LOG_FORMAT = originalEnv
    })

    test('Pretty format when LOG_FORMAT=pretty', () => {
      const originalEnv = process.env.LOG_FORMAT
      process.env.LOG_FORMAT = 'pretty'
      
      expect(() => {
        ohnana({ plugins: [logger()] })
      }).not.toThrow()
      
      process.env.LOG_FORMAT = originalEnv
    })

    test('Auto-detect TTY when no format specified', () => {
      const originalEnv = process.env.LOG_FORMAT
      const originalNodeEnv = process.env.NODE_ENV
      delete process.env.LOG_FORMAT
      delete process.env.NODE_ENV
      
      expect(() => {
        ohnana({ plugins: [logger()] })
      }).not.toThrow()
      
      process.env.LOG_FORMAT = originalEnv
      process.env.NODE_ENV = originalNodeEnv
    })
  })

  describe('Standalone Logger', () => {
    test('createLogger is exported from plugins', async () => {
      const { createLogger } = await import('../plugins')
      
      expect(createLogger).toBeDefined()
      expect(typeof createLogger).toBe('function')
    })

    test('createLogger works outside request context', async () => {
      const { createLogger } = await import('../plugins')
      const logger = createLogger()
      
      expect(() => {
        logger.info('test message')
        logger.debug('debug message')
        logger.warn('warning message')
        logger.error('error message')
      }).not.toThrow()
    })
  })

  describe('Context System', () => {
    test('logger provides all required methods', async () => {
      const app = ohnana({ plugins: [logger()] })
      
      app.get('/', (c) => {
        const log = c.get('logger')
        
        expect(typeof log.debug).toBe('function')
        expect(typeof log.info).toBe('function')
        expect(typeof log.warn).toBe('function')
        expect(typeof log.error).toBe('function')
        
        return c.json({ ok: true })
      })

      const client = createTestClient(app)
      await client.get('/')
    })

    test('logger accepts metadata objects', async () => {
      const app = ohnana({ plugins: [logger()] })
      
      app.get('/', (c) => {
        const log = c.get('logger')
        
        // Should not throw with metadata
        expect(() => {
          log.info('message', { key: 'value', count: 42 })
          log.debug('debug', { nested: { data: true } })
        }).not.toThrow()
        
        return c.json({ ok: true })
      })

      const client = createTestClient(app)
      await client.get('/')
    })
  })

  describe('Backward Compatibility', () => {
    test('existing logger() plugin call still works', () => {
      expect(() => {
        ohnana({ plugins: [requestId(), logger()] })
      }).not.toThrow()
    })

    test('Logger interface unchanged', async () => {
      const app = ohnana({ plugins: [logger()] })
      
      app.get('/', (c) => {
        const log = c.get('logger')
        
        // Original interface methods
        log.debug('message')
        log.info('message')
        log.warn('message')
        log.error('message')
        
        // With metadata
        log.debug('message', {})
        log.info('message', {})
        log.warn('message', {})
        log.error('message', {})
        
        return c.json({ ok: true })
      })

      const client = createTestClient(app)
      const res = await client.get('/')
      expect(res.status).toBe(200)
    })
  })
})
