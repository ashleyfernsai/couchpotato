import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { registerRoomHandlers } from './socket/roomHandlers.js';
import { registerSyncHandlers } from './socket/syncHandlers.js';
import { registerChatHandlers } from './socket/chatHandlers.js';
import { registerSignalingHandlers } from './socket/signalingHandlers.js';
import { roomStore } from './services/roomStore.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  const stats = roomStore.getStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    ...stats,
  });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// ── Socket.IO Connection Handler ──
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  registerRoomHandlers(io, socket);
  registerSyncHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerSignalingHandlers(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────────┐
  │                                          │
  │   🥔 CouchPotato Server                 │
  │   Running on http://localhost:${PORT}       │
  │   Client URL: ${CLIENT_URL}  │
  │                                          │
  └──────────────────────────────────────────┘
  `);
});
