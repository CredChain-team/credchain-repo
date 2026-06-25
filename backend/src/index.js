// ─────────────────────────────────────────────────────────────
// CredChain Backend — entry point
// Express HTTP server + Socket.io realtime layer + MongoDB (Mongoose)
// Listens on http://localhost:5000
// ─────────────────────────────────────────────────────────────

require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const apiRoutes = require('./routes/api');

// ── Configuration ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/credchain';

// ── Express app ──────────────────────────────────────────────
const app = express();

// CORS: allow the configured frontend origin plus the equivalent dev hosts.
// Vite runs with host:true, so the same app is reachable at localhost,
// 127.0.0.1 and the machine's LAN IP — all on port 3000. Browsers treat
// those as DIFFERENT origins, so we must accept all of them or API calls
// from (say) http://127.0.0.1:3000 get silently CORS-blocked.
const STATIC_ALLOWED = new Set([
  CLIENT_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function isAllowedOrigin(origin) {
  // No Origin header → same-origin / curl / server-to-server: allow.
  if (!origin) return true;
  if (STATIC_ALLOWED.has(origin)) return true;
  // Any LAN IPv4 host on the frontend port (e.g. http://192.168.1.5:3000).
  if (/^http:\/\/\d{1,3}(\.\d{1,3}){3}:3000$/.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, cb) {
    return isAllowedOrigin(origin)
      ? cb(null, true)
      : cb(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Lightweight request logger (handy during development).
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ── Health check ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'credchain-backend',
    status: 'ok',
    port: PORT,
    time: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ── API routes ───────────────────────────────────────────────
app.use('/api', apiRoutes);
// Advanced systems (issuer funnel, two-tier trust, bulk upload, AI proxies,
// SVG badge, anti-spam chat, on-chain revocation). Legacy /api/* untouched.
app.use('/api/v1', require('./routes/v1'));

// 404 fallback for unknown routes.
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralised error handler.
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── HTTP server + Socket.io ──────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, cb) {
      return isAllowedOrigin(origin)
        ? cb(null, true)
        : cb(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make the io instance available to routes/controllers via app locals.
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  // Join a per-user room so we can target direct messages.
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(String(userId));
      console.log(`[socket] ${socket.id} joined room ${userId}`);
    }
  });

  // Realtime chat relay.
  socket.on('chat:message', (payload) => {
    const { to } = payload || {};
    if (to) {
      io.to(String(to)).emit('chat:message', payload);
    } else {
      socket.broadcast.emit('chat:message', payload);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket] client disconnected: ${socket.id} (${reason})`);
  });
});

// ── Boot ─────────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[mongo] connected to ${MONGO_URI}`);
  } catch (err) {
    // Do not crash the dev server if Mongo is offline — log and continue
    // so the API/proxy/socket layers remain testable.
    console.error('[mongo] connection failed:', err.message);
  }

  server.listen(PORT, () => {
    console.log('────────────────────────────────────────────');
    console.log(` CredChain backend running`);
    console.log(` → http://localhost:${PORT}`);
    console.log(` → CORS allowed origin: ${CLIENT_ORIGIN}`);
    console.log('────────────────────────────────────────────');
  });
}

start();

// Graceful shutdown.
process.on('SIGINT', async () => {
  console.log('\n[shutdown] closing server...');
  await mongoose.connection.close().catch(() => {});
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };
