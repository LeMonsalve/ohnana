# uHono

A meta-framework for [Hono](https://hono.dev) with a powerful plugin system and full TypeScript type inference.

## Features

- 🔌 **Plugin System**: Everything is a plugin with 5 lifecycle hooks
- 🎯 **Type Inference**: Automatic context type inference from plugins
- 🚀 **CLI**: Scaffold new projects with `uhono create`
- 🛠️ **Built-in Plugins**: requestId, logger, cors, errorHandler
- 📦 **3 Subpath Exports**: Core, plugins, and toolkit

## Installation

```bash
bun add uhono hono
```

## Quick Start

```typescript
import { uhono } from 'uhono'
import { requestId, logger, errorHandler, cors } from 'uhono/plugins'

const app = uhono({
  plugins: [
    requestId(),
    logger(),
    errorHandler(),
    cors()
  ]
})

app.get('/', (c) => {
  const id = c.get('requestId') // ✅ Fully typed!
  return c.json({ message: 'Hello!', requestId: id })
})

export default {
  port: 3000,
  fetch: app.fetch,
}
```

## CLI

Create a new project:

```bash
bunx uhono create my-app
cd my-app
bun run dev
```

## Plugin System

### Built-in Plugins

#### requestId
Generates a unique UUID for each request and adds `X-Request-ID` header.

```typescript
import { requestId } from 'uhono/plugins'

uhono({ plugins: [requestId()] })
```

Context extension: `{ requestId: string }`

#### logger
Simple request/response logging with timing.

```typescript
import { logger } from 'uhono/plugins'

uhono({ plugins: [logger()] })
```

#### cors
CORS headers with permissive defaults (`origin: '*'`).

```typescript
import { cors } from 'uhono/plugins'

uhono({ plugins: [cors()] })
```

#### errorHandler
Structured error responses with format: `{ message, code, requestId }`.

```typescript
import { errorHandler } from 'uhono/plugins'

uhono({ plugins: [errorHandler()] })
```

Handles `HTTPException` from Hono and includes a 404 handler.

### Creating Custom Plugins

```typescript
import { definePlugin } from 'uhono/toolkit'

const myPlugin = definePlugin({
  id: 'myPlugin',
  context: {} as { myValue: string },
  
  onInit: (app) => {
    console.log('Plugin initialized')
  },
  
  onRequest: async (c, next) => {
    c.set('myValue', 'hello')
    await next()
  },
  
  onResponse: (c, response) => {
    console.log('Response generated')
    return response
  },
  
  onError: (error, c) => {
    console.error('Error:', error)
    return c.json({ error: error.message }, 500)
  },
  
  onShutdown: async () => {
    console.log('Shutting down')
  }
})

const app = uhono({
  plugins: [myPlugin()]
})

app.get('/', (c) => {
  const value = c.get('myValue') // ✅ Typed as string!
  return c.json({ value })
})
```

### Plugin Hooks

Plugins have 5 lifecycle hooks:

1. **onInit**: Called when plugin is registered
2. **onRequest**: Middleware executed before each request
3. **onResponse**: Called after response is generated
4. **onError**: Called when an error occurs
5. **onShutdown**: Called when app is shutting down

## Type Inference

uHono automatically infers context types from your plugins:

```typescript
const app = uhono({
  plugins: [
    requestId(),  // adds { requestId: string }
    myPlugin()    // adds { myValue: string }
  ]
})

app.get('/', (c) => {
  c.get('requestId') // ✅ string
  c.get('myValue')   // ✅ string
  c.get('unknown')   // ❌ TypeScript error
})
```

## API Reference

### Core

```typescript
import { uhono, UHono } from 'uhono'

// Recommended: uhono() with automatic type inference
const app = uhono({ plugins: [...] })

// Alternative: new UHono() with as const
const app = new UHono({ plugins: [...] as const })
```

### Plugins

```typescript
import { requestId, logger, cors, errorHandler } from 'uhono/plugins'
```

### Toolkit

```typescript
import { definePlugin } from 'uhono/toolkit'
import type { PluginDefinition, PluginHooks, PluginInstance } from 'uhono/toolkit'
```

## Examples

### Basic API

```typescript
import { uhono } from 'uhono'
import { requestId, logger, errorHandler } from 'uhono/plugins'

const app = uhono({
  plugins: [requestId(), logger(), errorHandler()]
})

app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id, requestId: c.get('requestId') })
})

export default { port: 3000, fetch: app.fetch }
```

### Error Handling

```typescript
import { HTTPException } from 'hono/http-exception'

app.get('/error', () => {
  throw new HTTPException(400, { message: 'Bad Request' })
})

// Returns: { message: 'Bad Request', code: 'BAD_REQUEST', requestId: '...' }
```

### Custom Plugin with Config

```typescript
const authPlugin = definePlugin({
  id: 'auth',
  context: {} as { userId: string },
  
  onRequest: async (c, next) => {
    const token = c.req.header('Authorization')
    if (!token) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }
    c.set('userId', 'user-123')
    await next()
  }
})

const app = uhono({
  plugins: [authPlugin()]
})
```

## Architecture

- **Base**: Extends Hono (NOT OpenAPIHono)
- **Plugin System**: 5 hooks with context extension
- **Type Safety**: Generic inference for full type safety
- **Config**: t3-env + zod for environment variables
- **Error Format**: `{ message, code, details?, requestId? }`

## License

MIT

## Contributing

Contributions welcome! This is an MVP - feel free to open issues or PRs.
