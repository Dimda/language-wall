import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServer, ServerToClient } from '../shared/protocol';
import { Game } from './game';

// Local secrets (e.g. TYPESAFE_API_KEY) live in .env, which is git-ignored. Hosts set real env vars.
try {
  process.loadEnvFile();
} catch {}

const prod = process.env.NODE_ENV === 'production';
// In production the host (Render) assigns PORT. In dev, PORT belongs to Vite, so the API uses API_PORT.
const PORT = Number((prod ? process.env.PORT : process.env.API_PORT) ?? 3210);

const app = express();
const http = createServer(app);
const io = new Server<ClientToServer, ServerToClient, object, { playerId?: string }>(http, {
  cors: prod ? undefined : { origin: true },
});

if (prod) {
  const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  app.use(express.static(dist));
  app.get('/{*splat}', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

const game = new Game(
  {
    snapshot: (s) => io.emit('snapshot', s),
    task: (playerId, t) => (t ? io.to(playerId).emit('task', t) : io.to(playerId).emit('taskCleared')),
    resolve: (t) => io.emit('resolve', t),
    bossAttack: (damage) => io.emit('bossAttack', { damage }),
    rejected: (playerId, reason) => io.to(playerId).emit('submitRejected', reason),
  },
  {
    devMode: process.env.DEV_BOTS === '1' || !prod,
    timing: process.env.HOP_SECONDS ? { hopMs: Number(process.env.HOP_SECONDS) * 1000 } : undefined,
  },
);

io.on('connection', (socket) => {
  const id = () => socket.data.playerId;

  socket.on('hello', ({ playerId }) => {
    if (typeof playerId !== 'string' || playerId.length > 64) return;
    socket.data.playerId = playerId;
    void socket.join(playerId);
    if (game.hasPlayer(playerId)) game.reconnect(playerId);
    else socket.emit('snapshot', game.snapshot());
  });

  socket.on('join', ({ name, avatar }) => {
    const pid = id();
    if (!pid || typeof name !== 'string') return;
    game.join(pid, name, avatar);
  });

  socket.on('typing', ({ typing }) => {
    const pid = id();
    if (pid) game.setTyping(pid, !!typing);
  });

  socket.on('start', () => {
    const pid = id();
    if (pid) game.start(pid);
  });

  socket.on('submit', ({ chainId, text }) => {
    const pid = id();
    if (pid && typeof chainId === 'string' && typeof text === 'string') game.submit(pid, chainId, text);
  });

  socket.on('finalize', () => {
    const pid = id();
    if (pid) game.finalize(pid);
  });

  socket.on('restart', () => {
    const pid = id();
    if (pid) game.restart(pid);
  });

  socket.on('addBot', () => game.addBot());

  socket.on('removeBot', (payload) => {
    const pid = id();
    const botId = typeof payload?.botId === 'string' ? payload.botId : undefined;
    if (pid) game.removeBot(pid, botId);
  });

  socket.on('disconnect', async () => {
    const pid = id();
    if (!pid) return;
    // Another tab/socket for the same player may still be connected.
    const others = await io.in(pid).fetchSockets();
    if (others.length === 0) game.disconnect(pid);
  });
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`言葉の壁 server on http://localhost:${PORT} ${prod ? '(production)' : '(dev)'}`);
  console.log(`judge: ${process.env.TYPESAFE_API_KEY ? 'TypeSafe Jev' : 'mock (set TYPESAFE_API_KEY to use Jev)'}`);
});
