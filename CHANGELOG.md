# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2024

### Added
- Plugin system with 5 lifecycle hooks (onInit, onRequest, onResponse, onError, onShutdown)
- Full TypeScript type inference for plugin context
- 7 built-in plugins:
  - `requestId`: UUID generation and X-Request-ID header
  - `logger`: Request/response logging with timing
  - `cors`: CORS headers with configurable options
  - `errorHandler`: Structured error responses
  - `health`: Health check endpoint with custom checks
  - `rateLimiter`: In-memory rate limiting
  - `prometheus`: Prometheus metrics endpoint
- `ohnana()` helper function for automatic type inference
- `definePlugin()` toolkit for creating custom plugins
- Plugin dependency validation system
- `group()` method for route grouping with scoped plugins
- `serve()` method with graceful shutdown
- Testing utilities via `ohnana/testing`:
  - `createTestClient()` for testing without starting a server
  - `TestClient` and `TestResponse` interfaces
- CLI scaffolding (basic implementation)
- Environment variable management with t3-env and Zod
- 4 subpath exports: main, `/plugins`, `/toolkit`, `/testing`

### Architecture
- Built on Hono framework (not OpenAPIHono)
- Plugin-based architecture with context extension
- Type-safe context inference from plugin array
- Graceful shutdown with plugin cleanup

---

**Note**: Prior versions (0.2.0 through 0.3.3) are not documented in this changelog.

[Unreleased]: https://github.com/lemonsalve/ohnana/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/lemonsalve/ohnana/releases/tag/v0.4.0
