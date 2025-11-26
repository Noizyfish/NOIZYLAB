/**
 * GORUNFREEX1TRILLION - WEBSOCKET SERVER
 * Real-time bidirectional communication
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ============================================
// WEBSOCKET SERVER
// ============================================

class NoizyWebSocketServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.clients = new Map();
    this.rooms = new Map();
    this.middlewares = [];
    this.handlers = new Map();

    this.options = {
      heartbeatInterval: options.heartbeatInterval || 30000,
      maxPayloadSize: options.maxPayloadSize || 1024 * 1024, // 1MB
      ...options
    };

    this.stats = {
      connections: 0,
      messagesIn: 0,
      messagesOut: 0,
      bytesIn: 0,
      bytesOut: 0
    };
  }

  // Middleware support
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  // Message handler registration
  handle(event, handler) {
    this.handlers.set(event, handler);
    return this;
  }

  // Handle new connection
  async onConnection(socket, request) {
    const clientId = this.generateClientId();

    const client = {
      id: clientId,
      socket,
      rooms: new Set(),
      metadata: {},
      connectedAt: Date.now(),
      lastActivity: Date.now()
    };

    // Run middlewares
    for (const middleware of this.middlewares) {
      try {
        await middleware(client, request);
      } catch (error) {
        socket.close(4001, 'Unauthorized');
        return;
      }
    }

    this.clients.set(clientId, client);
    this.stats.connections++;

    this.emit('connection', client);

    // Setup message handling
    socket.on('message', (data) => this.onMessage(client, data));
    socket.on('close', () => this.onDisconnect(client));
    socket.on('error', (error) => this.emit('error', { client, error }));

    // Send welcome message
    this.send(clientId, { type: 'connected', clientId });

    // Start heartbeat
    this.startHeartbeat(client);

    return client;
  }

  async onMessage(client, rawData) {
    client.lastActivity = Date.now();
    this.stats.messagesIn++;
    this.stats.bytesIn += rawData.length;

    try {
      const message = JSON.parse(rawData.toString());

      // Handle built-in events
      if (message.type === 'ping') {
        this.send(client.id, { type: 'pong', timestamp: Date.now() });
        return;
      }

      if (message.type === 'join') {
        this.joinRoom(client.id, message.room);
        return;
      }

      if (message.type === 'leave') {
        this.leaveRoom(client.id, message.room);
        return;
      }

      // Handle registered events
      const handler = this.handlers.get(message.type);
      if (handler) {
        const response = await handler(message, client);
        if (response) {
          this.send(client.id, response);
        }
      }

      this.emit('message', { client, message });

    } catch (error) {
      this.emit('error', { client, error });
    }
  }

  onDisconnect(client) {
    // Leave all rooms
    for (const room of client.rooms) {
      this.leaveRoom(client.id, room);
    }

    this.clients.delete(client.id);
    this.emit('disconnect', client);
  }

  // Send to specific client
  send(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== 1) return false;

    const data = JSON.stringify(message);
    client.socket.send(data);

    this.stats.messagesOut++;
    this.stats.bytesOut += data.length;

    return true;
  }

  // Broadcast to all clients
  broadcast(message, excludeClient = null) {
    const data = JSON.stringify(message);

    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClient && client.socket.readyState === 1) {
        client.socket.send(data);
        this.stats.messagesOut++;
        this.stats.bytesOut += data.length;
      }
    }
  }

  // Room management
  joinRoom(clientId, room) {
    const client = this.clients.get(clientId);
    if (!client) return false;

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }

    this.rooms.get(room).add(clientId);
    client.rooms.add(room);

    this.emit('roomJoin', { clientId, room });
    this.sendToRoom(room, { type: 'room:join', clientId, room }, clientId);

    return true;
  }

  leaveRoom(clientId, room) {
    const client = this.clients.get(clientId);
    const roomClients = this.rooms.get(room);

    if (client) client.rooms.delete(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }

    this.emit('roomLeave', { clientId, room });
    this.sendToRoom(room, { type: 'room:leave', clientId, room });
  }

  sendToRoom(room, message, excludeClient = null) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;

    const data = JSON.stringify(message);

    for (const clientId of roomClients) {
      if (clientId !== excludeClient) {
        const client = this.clients.get(clientId);
        if (client && client.socket.readyState === 1) {
          client.socket.send(data);
          this.stats.messagesOut++;
          this.stats.bytesOut += data.length;
        }
      }
    }
  }

  getRoomClients(room) {
    const roomClients = this.rooms.get(room);
    return roomClients ? Array.from(roomClients) : [];
  }

  // Heartbeat
  startHeartbeat(client) {
    const interval = setInterval(() => {
      if (Date.now() - client.lastActivity > this.options.heartbeatInterval * 2) {
        clearInterval(interval);
        client.socket.close(4000, 'Heartbeat timeout');
        return;
      }

      this.send(client.id, { type: 'heartbeat', timestamp: Date.now() });
    }, this.options.heartbeatInterval);

    client.heartbeatInterval = interval;
  }

  // Utilities
  generateClientId() {
    return crypto.randomBytes(16).toString('hex');
  }

  getClient(clientId) {
    return this.clients.get(clientId);
  }

  getStats() {
    return {
      ...this.stats,
      connectedClients: this.clients.size,
      rooms: this.rooms.size
    };
  }

  // Graceful shutdown
  async shutdown() {
    for (const [, client] of this.clients) {
      clearInterval(client.heartbeatInterval);
      client.socket.close(1001, 'Server shutting down');
    }

    this.clients.clear();
    this.rooms.clear();
    this.emit('shutdown');
  }
}

// ============================================
// PRESENCE SYSTEM
// ============================================

class PresenceManager {
  constructor(wsServer) {
    this.server = wsServer;
    this.presence = new Map();

    wsServer.on('connection', (client) => this.onConnect(client));
    wsServer.on('disconnect', (client) => this.onDisconnect(client));
  }

  onConnect(client) {
    this.presence.set(client.id, {
      id: client.id,
      status: 'online',
      connectedAt: client.connectedAt,
      metadata: client.metadata
    });

    this.broadcastPresence();
  }

  onDisconnect(client) {
    this.presence.delete(client.id);
    this.broadcastPresence();
  }

  setStatus(clientId, status, metadata = {}) {
    const existing = this.presence.get(clientId);
    if (existing) {
      existing.status = status;
      existing.metadata = { ...existing.metadata, ...metadata };
      existing.updatedAt = Date.now();
      this.broadcastPresence();
    }
  }

  getPresence(clientId) {
    return this.presence.get(clientId);
  }

  getAllPresence() {
    return Array.from(this.presence.values());
  }

  broadcastPresence() {
    const presenceList = this.getAllPresence();
    this.server.broadcast({
      type: 'presence:update',
      presence: presenceList,
      timestamp: Date.now()
    });
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  NoizyWebSocketServer,
  PresenceManager
};
