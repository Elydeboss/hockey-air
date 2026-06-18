const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const TICK_MS = 1000 / 60;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

// ─── Game Constants ────────────────────────────────────────────────
const WALL = 6, PUCK_R = 11, MALLET_R = 28;
const FRICTION = 0.994, MAX_SPEED = 22, INIT_SPEED = 7;
const WALL_BOUNCE = 0.88, MALLET_SMOOTH = 0.38;
const MALLET_IMPULSE_SPEED = 2, MALLET_IMPULSE_BASE = 2.5;
const LAYOUT = 'horizontal';
const W = 580, H = 360;
const GOAL_SIZE = H * 0.42;
const GOAL_POS = (H - GOAL_SIZE) / 2;

// ─── HTTP Server (serves static files) ─────────────────────────────
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url === '/' ? 'index.html' : req.url;
  // Handle clean URLs (no extension) — try .html
  if (!path.extname(urlPath) && urlPath !== '/sw.js') {
    urlPath += '.html';
  }
  let filePath = path.join(__dirname, 'public', urlPath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found');
      return;
    }
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (req.url === '/sw.js') {
      headers['Cache-Control'] = 'no-cache';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

// ─── WebSocket Server ──────────────────────────────────────────────
const wss = new WebSocket.Server({ server });

// ─── Room Management ───────────────────────────────────────────────
const rooms = new Map();
const roomCodes = new Set();

function generateCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  } while (roomCodes.has(code));
  return code;
}

class Room {
  constructor(code, winning) {
    this.code = code;
    this.winning = winning || 7;
    this.players = [null, null];
    this.inputs = [{ nx: 0.5, ny: 0.5 }, { nx: 0.5, ny: 0.5 }];
    this.state = this._freshState();
    this.interval = null;
    this.pendingReset = -1;
  }

  _freshState() {
    return {
      puck: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
      mallets: [
        { x: W * 0.82, y: H / 2, tx: W * 0.82, ty: H / 2, vx: 0, vy: 0 },
        { x: W * 0.18, y: H / 2, tx: W * 0.18, ty: H / 2, vx: 0, vy: 0 },
      ],
      score: [0, 0],
      goalTimer: 0,
      goalColor: '#fff',
      winner: -1,
      gameActive: true,
    };
  }

  start() {
    this.state = this._freshState();
    this.state.gameActive = true;
    this.pendingReset = -1;

    this._broadcast({
      type: 'game_start',
      player: 0,
      winning: this.winning,
      layout: LAYOUT,
    }, this.players[0]);
    this._broadcast({
      type: 'game_start',
      player: 1,
      winning: this.winning,
      layout: LAYOUT,
    }, this.players[1]);

    this.interval = setInterval(() => this._tick(), TICK_MS);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  setInput(playerIdx, nx, ny) {
    this.inputs[playerIdx] = { nx: Math.max(0, Math.min(1, nx)), ny: Math.max(0, Math.min(1, ny)) };
  }

  _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  _dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  _tick() {
    const s = this.state;
    if (!s.gameActive) return;

    // ── Update mallets from input ──
    for (let i = 0; i < 2; i++) {
      const m = s.mallets[i];
      const inp = this.inputs[i];
      m.tx = inp.nx * W;
      m.ty = inp.ny * H;

      const dx = m.tx - m.x;
      const dy = m.ty - m.y;
      m.vx = dx * MALLET_SMOOTH;
      m.vy = dy * MALLET_SMOOTH;
      m.x += m.vx;
      m.y += m.vy;

      if (i === 0) {
        m.x = this._clamp(m.x, W / 2 + 2, W - WALL - MALLET_R);
        m.y = this._clamp(m.y, WALL + MALLET_R, H - WALL - MALLET_R);
      } else {
        m.x = this._clamp(m.x, WALL + MALLET_R, W / 2 - 2);
        m.y = this._clamp(m.y, WALL + MALLET_R, H - WALL - MALLET_R);
      }
    }

    // ── Update puck ──
    const p = s.puck;
    // Clamp displacement
    let spd = Math.hypot(p.vx, p.vy);
    if (spd > PUCK_R * 1.5) {
      const scale = (PUCK_R * 1.5) / spd;
      p.vx *= scale; p.vy *= scale;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= FRICTION;
    p.vy *= FRICTION;
    spd = Math.hypot(p.vx, p.vy);
    if (spd > MAX_SPEED) { p.vx = p.vx / spd * MAX_SPEED; p.vy = p.vy / spd * MAX_SPEED; }
    if (spd < 0.5) { p.vx += (Math.random() - 0.5) * 0.8; p.vy += (Math.random() - 0.5) * 0.8; }

    // ── Wall bounces & goals ──
    // top/bottom
    if (p.y - PUCK_R < WALL) { p.y = WALL + PUCK_R; p.vy = Math.abs(p.vy) * WALL_BOUNCE; }
    if (p.y + PUCK_R > H - WALL) { p.y = H - WALL - PUCK_R; p.vy = -Math.abs(p.vy) * WALL_BOUNCE; }
    // left wall (red/P2 goal)
    if (p.x - PUCK_R < WALL) {
      if (p.y > GOAL_POS && p.y < GOAL_POS + GOAL_SIZE) {
        s.score[0]++;
        if (s.score[0] >= this.winning) { this._gameOver(0); return; }
        s.goalTimer = 45; s.goalColor = '#0f0';
        this.pendingReset = 1;
        this._broadcast({ type: 'goal', color: '#0f0', scorer: 0 });
        return;
      }
      p.x = WALL + PUCK_R; p.vx = Math.abs(p.vx) * WALL_BOUNCE;
    }
    // right wall (green/P1 goal)
    if (p.x + PUCK_R > W - WALL) {
      if (p.y > GOAL_POS && p.y < GOAL_POS + GOAL_SIZE) {
        s.score[1]++;
        if (s.score[1] >= this.winning) { this._gameOver(1); return; }
        s.goalTimer = 45; s.goalColor = '#f00';
        this.pendingReset = 0;
        this._broadcast({ type: 'goal', color: '#f00', scorer: 1 });
        return;
      }
      p.x = W - WALL - PUCK_R; p.vx = -Math.abs(p.vx) * WALL_BOUNCE;
    }

    // ── Corner escape ──
    if (Math.hypot(p.vx, p.vy) < 3) {
      const Z = 40, N = 2;
      if (p.x - WALL < Z && p.y - WALL < Z) { p.vx += N; p.vy += N; }
      else if ((W - WALL) - p.x < Z && p.y - WALL < Z) { p.vx -= N; p.vy += N; }
      else if (p.x - WALL < Z && (H - WALL) - p.y < Z) { p.vx += N; p.vy -= N; }
      else if ((W - WALL) - p.x < Z && (H - WALL) - p.y < Z) { p.vx -= N; p.vy -= N; }
    }

    // ── Mallet-puck collisions ──
    for (let i = 0; i < 2; i++) {
      const m = s.mallets[i];
      const d2 = this._dist(p, m);
      if (d2 < PUCK_R + MALLET_R) {
        const nx = (p.x - m.x) / d2;
        const ny = (p.y - m.y) / d2;
        p.x += nx * (PUCK_R + MALLET_R - d2);
        p.y += ny * (PUCK_R + MALLET_R - d2);
        // Push out of wall if shoved
        if (p.x - PUCK_R < WALL) { p.x = WALL + PUCK_R; p.vx = Math.abs(p.vx) * WALL_BOUNCE; }
        if (p.x + PUCK_R > W - WALL) { p.x = W - WALL - PUCK_R; p.vx = -Math.abs(p.vx) * WALL_BOUNCE; }
        if (p.y - PUCK_R < WALL) { p.y = WALL + PUCK_R; p.vy = Math.abs(p.vy) * WALL_BOUNCE; }
        if (p.y + PUCK_R > H - WALL) { p.y = H - WALL - PUCK_R; p.vy = -Math.abs(p.vy) * WALL_BOUNCE; }

        const dot = p.vx * nx + p.vy * ny;
        const imp = Math.hypot(m.vx, m.vy) * MALLET_IMPULSE_SPEED + MALLET_IMPULSE_BASE;
        p.vx = p.vx - 2 * dot * nx + m.vx * imp * nx;
        p.vy = p.vy - 2 * dot * ny + m.vy * imp * ny;
        const s2 = Math.hypot(p.vx, p.vy);
        if (s2 > MAX_SPEED) { p.vx = p.vx / s2 * MAX_SPEED; p.vy = p.vy / s2 * MAX_SPEED; }
      }
    }

    // ── Goal timer countdown ──
    if (s.goalTimer > 0) {
      s.goalTimer--;
      if (s.goalTimer === 0 && this.pendingReset >= 0) {
        this._resetPuck(this.pendingReset);
        this.pendingReset = -1;
      }
    }

    // ── Broadcast state ──
    this._broadcastState();
  }

  _resetPuck(who) {
    const p = this.state.puck;
    p.x = W / 2; p.y = H / 2;
    const dir = who === 0 ? 1 : -1;
    const a = (Math.random() - 0.5) * Math.PI * 0.5;
    p.vx = dir * Math.cos(a) * INIT_SPEED;
    p.vy = Math.sin(a) * INIT_SPEED;
  }

  _gameOver(winner) {
    this.state.gameActive = false;
    this.state.winner = winner;
    this._broadcast({ type: 'game_over', winner });
    this._broadcastState();
    this.stop();
    // Clean up room after 10 seconds
    setTimeout(() => {
      rooms.delete(this.code);
      roomCodes.delete(this.code);
    }, 10000);
  }

  _broadcastState() {
    const s = this.state;
    // Only send what clients need to render
    const msg = {
      type: 'state',
      puck: { x: s.puck.x, y: s.puck.y },
      mallets: [
        { x: s.mallets[0].x, y: s.mallets[0].y },
        { x: s.mallets[1].x, y: s.mallets[1].y },
      ],
      score: s.score,
      goalTimer: s.goalTimer,
      goalColor: s.goalColor,
      winner: s.winner,
    };
    this._broadcast(msg);
  }

  _broadcast(msg, target) {
    const data = JSON.stringify(msg);
    if (target) {
      if (target.readyState === WebSocket.OPEN) target.send(data);
      return;
    }
    for (const ws of this.players) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }

  disconnectPlayer(ws) {
    const idx = this.players.indexOf(ws);
    if (idx === -1) return;
    this.players[idx] = null;
    this._broadcast({ type: 'opponent_disconnected' });
    this.stop();
    // Remove room after short delay
    setTimeout(() => {
      rooms.delete(this.code);
      roomCodes.delete(this.code);
    }, 5000);
  }
}

// ─── WebSocket Connection Handler ──────────────────────────────────
wss.on('connection', (ws) => {
  let currentRoom = null;
  let playerIdx = -1;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create_room': {
        if (currentRoom) return;
        const code = generateCode();
        const room = new Room(code, msg.winning || 7);
        room.players[0] = ws;
        rooms.set(code, room);
        roomCodes.add(code);
        currentRoom = room;
        playerIdx = 0;
        ws.send(JSON.stringify({ type: 'room_created', code }));
        break;
      }

      case 'join_room': {
        if (currentRoom) return;
        const code = (msg.code || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'room_error', message: 'Room not found' }));
          return;
        }
        if (room.players[0] && room.players[1]) {
          ws.send(JSON.stringify({ type: 'room_error', message: 'Room is full' }));
          return;
        }
        const slot = room.players[0] ? 1 : 0;
        room.players[slot] = ws;
        currentRoom = room;
        playerIdx = slot;
        ws.send(JSON.stringify({ type: 'room_joined', player: slot }));
        // Notify both: game starting
        room.start();
        break;
      }

      case 'input': {
        if (!currentRoom || playerIdx < 0) return;
        currentRoom.setInput(playerIdx, msg.nx, msg.ny);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      currentRoom.disconnectPlayer(ws);
    }
  });
});

// ─── Start Server ──────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Air Hockey server running on http://localhost:${PORT}`);
});
