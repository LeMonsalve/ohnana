// ============================================
// WebSocket Types
// ============================================

/**
 * WebSocket plugin configuration
 */
export interface WebSocketConfig {
  /** WebSocket endpoint path (default: '/ws') */
  path?: string;
  /** Called when a client connects */
  onOpen?: (ws: WebSocketClient) => void;
  /** Called when a message is received */
  onMessage?: (ws: WebSocketClient, message: WebSocketMessage) => void;
  /** Called when a client disconnects */
  onClose?: (ws: WebSocketClient) => void;
  /** Called when an error occurs */
  onError?: (ws: WebSocketClient, error: Error) => void;
}

/**
 * WebSocket client wrapper for type-safe operations
 */
export interface WebSocketClient {
  /** Unique client identifier */
  readonly id: string;
  /** Send JSON data to this client */
  send(data: unknown): void;
  /** Join a room/channel */
  join(room: string): void;
  /** Leave a room/channel */
  leave(room: string): void;
  /** Get rooms this client is in */
  readonly rooms: ReadonlySet<string>;
  /** Close the connection */
  close(): void;
  /** Raw Bun ServerWebSocket (for advanced use) */
  readonly raw: unknown;
}

/**
 * WebSocket server interface for broadcasting and room management
 * Available in HTTP routes via c.get('ws')
 */
export interface WebSocketServer {
  /** Broadcast to all clients in a room */
  broadcast(room: string, data: unknown): void;
  /** Broadcast to all connected clients */
  broadcastAll(data: unknown): void;
  /** Get all clients in a room */
  clients(room?: string): ReadonlySet<WebSocketClient>;
  /** Get count of connected clients */
  readonly clientCount: number;
}

/**
 * WebSocket message protocol (JSON)
 */
export interface WebSocketMessage<T = unknown> {
  /** Action type: 'join', 'leave', 'broadcast', or custom */
  action: string;
  /** Target room for join/leave/broadcast actions */
  room?: string;
  /** Message payload */
  data?: T;
}

/**
 * Internal WebSocket data attached to each connection
 */
export interface WebSocketData {
  id: string;
  rooms: Set<string>;
}
