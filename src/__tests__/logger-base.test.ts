import { test, expect, describe, beforeEach, afterEach } from 'bun:test'

describe('Logger Base Utility', () => {
  let originalLogFormat: string | undefined
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalLogFormat = process.env.LOG_FORMAT
    originalNodeEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    if (originalLogFormat !== undefined) {
      process.env.LOG_FORMAT = originalLogFormat
    } else {
      delete process.env.LOG_FORMAT
    }
    
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv
    } else {
      delete process.env.NODE_ENV
    }
  })

  describe('createLogger Factory', () => {
    test('returns Logger interface with all required methods', () => {
      const { createLogger } = require('../utils/logger')
      const logger = createLogger()
      
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })

    test('accepts optional config parameter', () => {
      const { createLogger } = require('../utils/logger')
      
      expect(() => createLogger()).not.toThrow()
      expect(() => createLogger({ format: 'json' })).not.toThrow()
      expect(() => createLogger({ format: 'pretty' })).not.toThrow()
      expect(() => createLogger({ format: 'auto' })).not.toThrow()
    })
  })

  describe('Format Detection Priority', () => {
    test('uses config.format when explicitly provided', () => {
      const { createLogger } = require('../utils/logger')
      
      process.env.LOG_FORMAT = 'pretty'
      const logger = createLogger({ format: 'json' })
      
      expect(logger).toBeDefined()
    })

    test('uses LOG_FORMAT env var when config not provided', () => {
      const { createLogger } = require('../utils/logger')
      
      process.env.LOG_FORMAT = 'json'
      const logger = createLogger()
      
      expect(logger).toBeDefined()
    })

    test('uses NODE_ENV for format detection (production → json)', () => {
      const { createLogger } = require('../utils/logger')
      
      delete process.env.LOG_FORMAT
      process.env.NODE_ENV = 'production'
      const logger = createLogger()
      
      expect(logger).toBeDefined()
    })

    test('uses NODE_ENV for format detection (development → pretty)', () => {
      const { createLogger } = require('../utils/logger')
      
      delete process.env.LOG_FORMAT
      process.env.NODE_ENV = 'development'
      const logger = createLogger()
      
      expect(logger).toBeDefined()
    })

    test('falls back to TTY detection when no env vars', () => {
      const { createLogger } = require('../utils/logger')
      
      delete process.env.LOG_FORMAT
      delete process.env.NODE_ENV
      const logger = createLogger()
      
      expect(logger).toBeDefined()
    })
  })

  describe('JSON Format Output', () => {
    test('outputs valid JSON when format is json', () => {
      const { createLogger } = require('../utils/logger')
      
      const logs: string[] = []
      const originalLog = console.log
      console.log = (msg: unknown) => logs.push(String(msg))
      
      const logger = createLogger({ format: 'json' })
      logger.info('test message')
      
      console.log = originalLog
      
      expect(logs.length).toBe(1)
      const parsed = JSON.parse(logs[0]!)
      expect(parsed.level).toBe('info')
      expect(parsed.message).toBe('test message')
      expect(parsed.timestamp).toBeDefined()
    })

    test('includes metadata in JSON output', () => {
      const { createLogger } = require('../utils/logger')
      
      const logs: string[] = []
      const originalLog = console.log
      console.log = (msg: unknown) => logs.push(String(msg))
      
      const logger = createLogger({ format: 'json' })
      logger.info('test', { userId: '123', action: 'login' })
      
      console.log = originalLog
      
      const parsed = JSON.parse(logs[0]!)
      expect(parsed.userId).toBe('123')
      expect(parsed.action).toBe('login')
    })

    test('includes timestamp in ISO format', () => {
      const { createLogger } = require('../utils/logger')
      
      const logs: string[] = []
      const originalLog = console.log
      console.log = (msg: unknown) => logs.push(String(msg))
      
      const logger = createLogger({ format: 'json' })
      logger.info('test')
      
      console.log = originalLog
      
      const parsed = JSON.parse(logs[0]!)
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    test('outputs correct level for each method', () => {
      const { createLogger } = require('../utils/logger')
      
      const logs: string[] = []
      const originalLog = console.log
      console.log = (msg: unknown) => logs.push(String(msg))
      
      const logger = createLogger({ format: 'json' })
      logger.debug('debug msg')
      logger.info('info msg')
      logger.warn('warn msg')
      logger.error('error msg')
      
      console.log = originalLog
      
      expect(JSON.parse(logs[0]!).level).toBe('debug')
      expect(JSON.parse(logs[1]!).level).toBe('info')
      expect(JSON.parse(logs[2]!).level).toBe('warn')
      expect(JSON.parse(logs[3]!).level).toBe('error')
    })
  })

  describe('Pretty Format Output', () => {
    test('outputs human-readable format when format is pretty', () => {
      const { createLogger } = require('../utils/logger')
      
      const logs: string[] = []
      const originalLog = console.log
      console.log = (msg: unknown) => logs.push(String(msg))
      
      const logger = createLogger({ format: 'pretty' })
      logger.info('test message')
      
      console.log = originalLog
      
      expect(logs.length).toBe(1)
      expect(logs[0]).toContain('test message')
      expect(() => JSON.parse(logs[0]!)).toThrow()
    })

    test('includes ANSI color codes in pretty format', () => {
      const { createLogger } = require('../utils/logger')
      
      const logs: string[] = []
      const originalLog = console.log
      console.log = (msg: unknown) => logs.push(String(msg))
      
      const logger = createLogger({ format: 'pretty' })
      logger.info('test')
      
      console.log = originalLog
      
      expect(logs[0]).toContain('\x1b[')
    })

    test('displays metadata in pretty format', () => {
      const { createLogger } = require('../utils/logger')
      
      const logs: string[] = []
      const originalLog = console.log
      console.log = (msg: unknown) => logs.push(String(msg))
      
      const logger = createLogger({ format: 'pretty' })
      logger.info('test', { key: 'value' })
      
      console.log = originalLog
      
      expect(logs[0]).toContain('test')
      expect(logs[0]).toContain('key')
      expect(logs[0]).toContain('value')
    })
  })

  describe('Logger Interface Methods', () => {
    test('debug method works', () => {
      const { createLogger } = require('../utils/logger')
      
      const logger = createLogger({ format: 'json' })
      
      expect(() => logger.debug('debug message')).not.toThrow()
      expect(() => logger.debug('debug', { meta: 'data' })).not.toThrow()
    })

    test('info method works', () => {
      const { createLogger } = require('../utils/logger')
      
      const logger = createLogger({ format: 'json' })
      
      expect(() => logger.info('info message')).not.toThrow()
      expect(() => logger.info('info', { meta: 'data' })).not.toThrow()
    })

    test('warn method works', () => {
      const { createLogger } = require('../utils/logger')
      
      const logger = createLogger({ format: 'json' })
      
      expect(() => logger.warn('warn message')).not.toThrow()
      expect(() => logger.warn('warn', { meta: 'data' })).not.toThrow()
    })

    test('error method works', () => {
      const { createLogger } = require('../utils/logger')
      
      const logger = createLogger({ format: 'json' })
      
      expect(() => logger.error('error message')).not.toThrow()
      expect(() => logger.error('error', { meta: 'data' })).not.toThrow()
    })
  })

  describe('Metadata Handling', () => {
    test('accepts empty metadata object', () => {
      const { createLogger } = require('../utils/logger')
      
      const logger = createLogger({ format: 'json' })
      
      expect(() => logger.info('test', {})).not.toThrow()
    })

    test('accepts nested metadata objects', () => {
      const { createLogger } = require('../utils/logger')
      
      const logs: string[] = []
      const originalLog = console.log
      console.log = (msg: unknown) => logs.push(String(msg))
      
      const logger = createLogger({ format: 'json' })
      logger.info('test', { user: { id: '123', name: 'John' } })
      
      console.log = originalLog
      
      const parsed = JSON.parse(logs[0]!)
      expect(parsed.user.id).toBe('123')
      expect(parsed.user.name).toBe('John')
    })

    test('accepts various data types in metadata', () => {
      const { createLogger } = require('../utils/logger')
      
      const logs: string[] = []
      const originalLog = console.log
      console.log = (msg: unknown) => logs.push(String(msg))
      
      const logger = createLogger({ format: 'json' })
      logger.info('test', {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3]
      })
      
      console.log = originalLog
      
      const parsed = JSON.parse(logs[0]!)
      expect(parsed.string).toBe('value')
      expect(parsed.number).toBe(42)
      expect(parsed.boolean).toBe(true)
      expect(parsed.null).toBe(null)
      expect(parsed.array).toEqual([1, 2, 3])
    })
  })
})
