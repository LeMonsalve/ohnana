import type { ServerWebSocket } from 'bun'
import type { PluginInstance, WebSocketConfig, WebSocketClient, WebSocketServer, WebSocketMessage, WebSocketData } from '../types'
import { createLogger } from '../utils/logger'

const logger = createLogger()

/**
 * Internal state for WebSocket server
 */
class WebSocketServerImpl implements WebSocketServer {
  private _clientsMap = new Map<string, WebSocketClient>()
  private _rooms = new Map<string, Set<string>>()
  private _sockets = new Map<string, ServerWebSocket<WebSocketData>>()

  getClient(id: string): WebSocketClient | undefined {
    return this._clientsMap.get(id)
  }

  registerClient(ws: ServerWebSocket<WebSocketData>): WebSocketClient {
    const client = new WebSocketClientImpl(ws, this)
    this._clientsMap.set(ws.data.id, client)
    this._sockets.set(ws.data.id, ws)
    return client
  }

  unregisterClient(ws: ServerWebSocket<WebSocketData>): void {
    const id = ws.data.id
    // Remove from all rooms
    for (const room of ws.data.rooms) {
      this._rooms.get(room)?.delete(id)
      if (this._rooms.get(room)?.size === 0) {
        this._rooms.delete(room)
      }
    }
    this._clientsMap.delete(id)
    this._sockets.delete(id)
  }

  joinRoom(clientId: string, room: string): void {
    if (!this._rooms.has(room)) {
      this._rooms.set(room, new Set())
    }
    this._rooms.get(room)!.add(clientId)
    const ws = this._sockets.get(clientId)
    if (ws) {
      ws.data.rooms.add(room)
    }
  }

  leaveRoom(clientId: string, room: string): void {
    this._rooms.get(room)?.delete(clientId)
    if (this._rooms.get(room)?.size === 0) {
      this._rooms.delete(room)
    }
    const ws = this._sockets.get(clientId)
    if (ws) {
      ws.data.rooms.delete(room)
    }
  }

  broadcast(room: string, data: unknown): void {
    const clientIds = this._rooms.get(room)
    if (!clientIds) return
    
    const message = JSON.stringify(data)
    for (const clientId of clientIds) {
      const ws = this._sockets.get(clientId)
      if (ws) {
        ws.send(message)
      }
    }
  }

  broadcastAll(data: unknown): void {
    const message = JSON.stringify(data)
    for (const ws of this._sockets.values()) {
      ws.send(message)
    }
  }

  clients(room?: string): ReadonlySet<WebSocketClient> {
    if (room) {
      const clientIds = this._rooms.get(room) || new Set()
      const clients = new Set<WebSocketClient>()
      for (const id of clientIds) {
        const client = this._clientsMap.get(id)
        if (client) clients.add(client)
      }
      return clients
    }
    return new Set(this._clientsMap.values())
  }

  get clientCount(): number {
    return this._clientsMap.size
  }

  getSocket(clientId: string): ServerWebSocket<WebSocketData> | undefined {
    return this._sockets.get(clientId)
  }
}

/**
 * Client wrapper for type-safe operations
 */
class WebSocketClientImpl implements WebSocketClient {
  constructor(
    private ws: ServerWebSocket<WebSocketData>,
    private server: WebSocketServerImpl
  ) {}

  get id(): string {
    return this.ws.data.id
  }

  send(data: unknown): void {
    this.ws.send(JSON.stringify(data))
  }

  join(room: string): void {
    this.server.joinRoom(this.id, room)
  }

  leave(room: string): void {
    this.server.leaveRoom(this.id, room)
  }

  get rooms(): ReadonlySet<string> {
    return this.ws.data.rooms
  }

  close(): void {
    this.ws.close()
  }

  get raw(): unknown {
    return this.ws
  }
}

// Global server instance (singleton per process)
let wsServer: WebSocketServerImpl | null = null

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wsServer
}

/**
 * WebSocket plugin with Pub/Sub rooms support
 * 
 * @example
 * ```ts
 * import { websocket } from 'ohnana/plugins'
 * 
 * const app = ohnana({
 *   plugins: [
 *     websocket({
 *       path: '/ws',
 *       onOpen: (ws) => console.log('Client connected:', ws.id),
 *       onMessage: (ws, msg) => {
 *         // Handle custom messages
 *         if (msg.action === 'chat') {
 *           ws.server.broadcast(msg.room, msg.data)
 *         }
 *       }
 *     })
 *   ]
 * })
 * 
 * // Broadcast from HTTP routes
 * app.post('/notify', (c) => {
 *   c.get('ws').broadcast('alerts', { message: 'Hello!' })
 *   return c.json({ sent: true })
 * })
 * ```
 */
export function websocket(config: WebSocketConfig = {}): PluginInstance<{ ws: WebSocketServer }> {
  const path = config.path ?? '/ws'
  
  // Initialize server singleton
  if (!wsServer) {
    wsServer = new WebSocketServerImpl()
  }
  const server = wsServer

  return {
    id: 'websocket',
    _context: {} as { ws: WebSocketServer },
    hooks: {
      onInit: (app) => {
        // Store config for serve() to use
        (app as any)._wsConfig = {
          path,
          handlers: {
            open: (ws: ServerWebSocket<WebSocketData>) => {
              const client = server.registerClient(ws)
              config.onOpen?.(client)
            },
            message: (ws: ServerWebSocket<WebSocketData>, message: string | Buffer) => {
              const client = server.getClient(ws.data.id)
              if (!client) return

              try {
                const parsed = JSON.parse(message.toString()) as WebSocketMessage
                
                // Handle built-in actions
                switch (parsed.action) {
                  case 'join':
                    if (parsed.room) {
                      (client as WebSocketClientImpl).join(parsed.room)
                      client.send({ action: 'joined', room: parsed.room })
                    }
                    break
                  case 'leave':
                    if (parsed.room) {
                      (client as WebSocketClientImpl).leave(parsed.room)
                      client.send({ action: 'left', room: parsed.room })
                    }
                    break
                  case 'broadcast':
                    if (parsed.room && parsed.data !== undefined) {
                      server.broadcast(parsed.room, parsed.data)
                    }
                    break
                  default:
                    // Forward to user handler for custom actions
                    config.onMessage?.(client, parsed)
                }
              } catch {
                // Not valid JSON, forward raw to user handler
                config.onMessage?.(client, { action: 'raw', data: message.toString() })
              }
            },
            close: (ws: ServerWebSocket<WebSocketData>) => {
              const client = server.getClient(ws.data.id)
              if (client) {
                config.onClose?.(client)
                server.unregisterClient(ws)
              }
            },
            error: (ws: ServerWebSocket<WebSocketData>, error: Error) => {
              const client = server.getClient(ws.data.id)
              if (client) {
                config.onError?.(client, error)
              }
            }
          }
        }
      },
      
      onRequest: async (c, next) => {
        // Make WebSocket server available in HTTP context
        (c as any).set('ws', server)
        await next()
      },
      
      onShutdown: async () => {
        // Close all connections
        if (wsServer) {
          wsServer.broadcastAll({ action: 'shutdown' })
          wsServer = null
        }
        logger.info('[WebSocket] All connections closed')
      }
    }
  }
}

export type { WebSocketConfig } from '../types'
