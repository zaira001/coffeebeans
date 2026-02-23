// server.js — CoffeeBeans Backend
// Run: node server.js
// Requires: npm install express better-sqlite3 cors

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ─── Passwords ────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD  = 'coffeebeans2024';   // Full admin access
const READER_PASSWORD = 'reader2024';        // Read-only journal access

// ─── Database Setup ───────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'coffeebeans.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT    NOT NULL CHECK(type IN ('Tula','Saloobin','Pagninilay','Kuwento')),
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token      TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS reader_sessions (
    token      TEXT PRIMARY KEY,
    username   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// Seed demo data if empty
const count = db.prepare('SELECT COUNT(*) as c FROM entries').get();
if (count.c === 0) {
  const ins = db.prepare('INSERT INTO entries (type, title, body) VALUES (?, ?, ?)');
  ins.run('Tula','Sa Umaga ng Lunes',
    `May amoy ng kape sa hangin,\nat ang tahimik na umaga\nay nagbibigay ng lakas\nsa mga salitang hindi ko masabi.\n\nHinihintay ko ang araw\nna magbibigay ng dahilan\npara ngumiti nang tunay—\nhindi lang dahil kailangan.`);
  ins.run('Pagninilay','Ang Katahimikan',
    `Sa katahimikan ng gabi, natutunan ko na ang pinakamalalim na mga salita ay hindi nababago sa hangin — nananatili sila sa loob ng dibdib, naghihintay na marinig.`);
  ins.run('Saloobin','Mga Tanong sa Umaga',
    `Bakit palagi akong nagigising nang may dala-dalang mga tanong na hindi ko kayang sagutin sa maghapon? Baka ang mga tanong mismo ang sagot.`);
  console.log('✓ Demo entries seeded');
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const session = db.prepare('SELECT * FROM admin_sessions WHERE token = ?').get(token);
  if (!session) return res.status(401).json({ error: 'Invalid session' });
  next();
}

// Allow both admin and reader sessions for public reads
function requireAnyAuth(req, res, next) {
  const token = req.headers['x-reader-token'] || req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const admin  = db.prepare('SELECT * FROM admin_sessions WHERE token = ?').get(token);
  const reader = db.prepare('SELECT * FROM reader_sessions WHERE token = ?').get(token);
  if (!admin && !reader) return res.status(401).json({ error: 'Invalid session' });
  next();
}

function genToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

// Admin login
app.post('/api/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Incorrect password' });
  const token = genToken();
  db.prepare('INSERT INTO admin_sessions (token) VALUES (?)').run(token);
  res.json({ token, role: 'admin' });
});

// Reader login
app.post('/api/reader-login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  if (username.trim().length < 2)
    return res.status(400).json({ error: 'Username must be at least 2 characters' });
  if (password !== READER_PASSWORD)
    return res.status(401).json({ error: 'Incorrect password' });
  const token = 'r_' + genToken();
  db.prepare('INSERT INTO reader_sessions (token, username) VALUES (?, ?)').run(token, username.trim());
  res.json({ token, role: 'reader', username: username.trim() });
});

app.post('/api/logout', (req, res) => {
  const token = req.headers['x-admin-token'] || req.headers['x-reader-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
  db.prepare('DELETE FROM reader_sessions WHERE token = ?').run(token);
  res.json({ ok: true });
});

// ─── PUBLIC ───────────────────────────────────────────────────────────────────
app.get('/api/entries', (req, res) => {
  const { type } = req.query;
  const entries = (type && type !== 'all')
    ? db.prepare('SELECT * FROM entries WHERE type = ? ORDER BY id DESC').all(type)
    : db.prepare('SELECT * FROM entries ORDER BY id DESC').all();
  res.json(entries);
});

app.get('/api/stats', (req, res) => {
  const total  = db.prepare('SELECT COUNT(*) as count FROM entries').get();
  const byType = db.prepare('SELECT type, COUNT(*) as count FROM entries GROUP BY type').all();
  const latest = db.prepare('SELECT created_at FROM entries ORDER BY id DESC LIMIT 1').get();
  res.json({ total: total.count, byType, latest: latest?.created_at || null });
});

// ─── ADMIN ────────────────────────────────────────────────────────────────────
app.post('/api/entries', requireAuth, (req, res) => {
  const { type, title, body } = req.body;
  const valid = ['Tula','Saloobin','Pagninilay','Kuwento'];
  if (!type || !title || !body) return res.status(400).json({ error: 'type, title, body required' });
  if (!valid.includes(type))   return res.status(400).json({ error: 'Invalid type' });
  const r = db.prepare('INSERT INTO entries (type, title, body) VALUES (?, ?, ?)').run(type, title.trim(), body.trim());
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(entry);
});

app.delete('/api/entries/:id', requireAuth, (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);
  res.json({ ok: true, id: Number(req.params.id) });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n☕  CoffeeBeans running → http://localhost:${PORT}`);
  console.log(`   Journal  → http://localhost:${PORT}/journal.html`);
  console.log(`   Admin    → http://localhost:${PORT}/admin.html`);
  console.log(`\n   Admin password:  ${ADMIN_PASSWORD}`);
  console.log(`   Reader password: ${READER_PASSWORD}\n`);
});