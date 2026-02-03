import type { Ohnana } from '../core'

/**
 * Response from test client
 */
export interface TestResponse {
  /** HTTP status code */
  status: number
  /** Response headers */
  headers: Headers
  /** Get response as text */
  text(): Promise<string>
  /** Get response as JSON */
  json<T = unknown>(): Promise<T>
  /** Get raw Response object */
  raw: Response
}

/**
 * Test client for making requests without a server
 */
export interface TestClient {
  get(path: string, init?: RequestInit): Promise<TestResponse>
  post(path: string, body?: unknown, init?: RequestInit): Promise<TestResponse>
  put(path: string, body?: unknown, init?: RequestInit): Promise<TestResponse>
  patch(path: string, body?: unknown, init?: RequestInit): Promise<TestResponse>
  delete(path: string, init?: RequestInit): Promise<TestResponse>
  request(path: string, init?: RequestInit): Promise<TestResponse>
}

/**
 * Create a test client for an Ohnana app
 * Makes requests directly to app.fetch() without starting a server
 * 
 * @example
 * ```ts
 * import { createTestClient } from 'ohnana/testing'
 * import { test, expect } from 'bun:test'
 * 
 * const app = ohnana({ plugins: [...] })
 * const client = createTestClient(app)
 * 
 * test('GET /users', async () => {
 *   const res = await client.get('/users')
 *   expect(res.status).toBe(200)
 *   const data = await res.json()
 *   expect(data.users).toBeArray()
 * })
 * ```
 */
export function createTestClient(app: Ohnana<any>): TestClient {
  const request = async (path: string, init?: RequestInit): Promise<TestResponse> => {
    const url = new URL(path, 'http://localhost').toString()
    const req = new Request(url, init)
    const res = await app.fetch(req)
    
    // Clone response for multiple reads
    const cloned = res.clone()
    
    return {
      status: res.status,
      headers: res.headers,
      text: () => cloned.text(),
      json: <T>() => cloned.json() as Promise<T>,
      raw: res,
    }
  }
  
  const withBody = (method: string) => {
    return async (path: string, body?: unknown, init?: RequestInit): Promise<TestResponse> => {
      return request(path, {
        ...init,
        method,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      })
    }
  }
  
  return {
    get: (path, init) => request(path, { ...init, method: 'GET' }),
    post: withBody('POST'),
    put: withBody('PUT'),
    patch: withBody('PATCH'),
    delete: (path, init) => request(path, { ...init, method: 'DELETE' }),
    request,
  }
}
