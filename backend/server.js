const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3001;

// ── DB Setup ──────────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'love.db');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS poems (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT    NOT NULL,
    body      TEXT    NOT NULL,
    author    TEXT    DEFAULT 'You',
    created   TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    date_time   TEXT    NOT NULL,
    location    TEXT,
    emoji       TEXT    DEFAULT '💕',
    done        INTEGER DEFAULT 0,
    created     TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS savings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT    NOT NULL,
    target      REAL    NOT NULL,
    current     REAL    DEFAULT 0,
    emoji       TEXT    DEFAULT '💰',
    color       TEXT    DEFAULT '#ff4d6d',
    created     TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS photos (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT    NOT NULL,
    caption  TEXT,
    category TEXT    DEFAULT 'memories',
    created  TEXT    DEFAULT (datetime('now'))
  );
`);

// Seed sample data if empty
const poemCount = db.prepare('SELECT COUNT(*) as c FROM poems').get().c;
if (poemCount === 0) {
  db.prepare(`INSERT INTO poems (title, body, author) VALUES (?, ?, ?)`).run(
    'First Sight',
    'In a world of noise and haste,\nYou appeared — soft, warm, unhurried.\nAnd in that single quiet moment,\nEverything I\'d lost came back to me.',
    'You'
  );
  db.prepare(`INSERT INTO poems (title, body, author) VALUES (?, ?, ?)`).run(
    'Late Nights',
    'We talk until the stars get tired,\nUntil the moon forgets its rounds.\nIn the silence between our words\nIs where home has always been.',
    'You'
  );
}

const dateCount = db.prepare('SELECT COUNT(*) as c FROM dates').get().c;
if (dateCount === 0) {
  db.prepare(`INSERT INTO dates (title, description, date_time, location, emoji) VALUES (?, ?, ?, ?, ?)`).run(
    'Rooftop Dinner',
    'Just the two of us, city lights, and your favorite food.',
    '2026-06-20T19:00:00',
    'Downtown Rooftop Café',
    '🌃'
  );
  db.prepare(`INSERT INTO dates (title, description, date_time, location, emoji) VALUES (?, ?, ?, ?, ?)`).run(
    'Dal Lake Shikara Ride',
    'A peaceful evening on the water.',
    '2026-07-04T17:30:00',
    'Dal Lake, Srinagar',
    '🛶'
  );
}

const savingCount = db.prepare('SELECT COUNT(*) as c FROM savings').get().c;
if (savingCount === 0) {
  db.prepare(`INSERT INTO savings (label, target, current, emoji, color) VALUES (?, ?, ?, ?, ?)`).run(
    'Dream Trip Together', 50000, 12000, '✈️', '#ff4d6d'
  );
  db.prepare(`INSERT INTO savings (label, target, current, emoji, color) VALUES (?, ?, ?, ?, ?)`).run(
    'Anniversary Surprise', 10000, 3500, '🎁', '#c77dff'
  );
}

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Photo Upload ───────────────────────────────────────────────────────────────
const PHOTOS_DIR = path.join(__dirname, '..', 'frontend', 'photos');
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, PHOTOS_DIR),
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── Routes ─────────────────────────────────────────────────────────────────────

// PHOTOS
app.get('/api/photos', (req, res) => {
  const rows = db.prepare('SELECT * FROM photos ORDER BY created DESC').all();
  res.json(rows);
});

app.post('/api/photos', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { caption = '', category = 'memories' } = req.body;
  const stmt = db.prepare('INSERT INTO photos (filename, caption, category) VALUES (?, ?, ?)');
  const info = stmt.run(req.file.filename, caption, category);
  res.json({ id: info.lastInsertRowid, filename: req.file.filename, caption, category });
});

app.delete('/api/photos/:id', (req, res) => {
  const row = db.prepare('SELECT filename FROM photos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const fp = path.join(PHOTOS_DIR, row.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POEMS
app.get('/api/poems', (_, res) => {
  res.json(db.prepare('SELECT * FROM poems ORDER BY created DESC').all());
});

app.post('/api/poems', (req, res) => {
  const { title, body, author = 'You' } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  const info = db.prepare('INSERT INTO poems (title, body, author) VALUES (?, ?, ?)').run(title, body, author);
  res.json({ id: info.lastInsertRowid, title, body, author });
});

app.put('/api/poems/:id', (req, res) => {
  const { title, body, author } = req.body;
  db.prepare('UPDATE poems SET title=?, body=?, author=? WHERE id=?').run(title, body, author, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/poems/:id', (req, res) => {
  db.prepare('DELETE FROM poems WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// DATES
app.get('/api/dates', (_, res) => {
  res.json(db.prepare('SELECT * FROM dates ORDER BY date_time ASC').all());
});

app.post('/api/dates', (req, res) => {
  const { title, description = '', date_time, location = '', emoji = '💕' } = req.body;
  if (!title || !date_time) return res.status(400).json({ error: 'title and date_time required' });
  const info = db.prepare('INSERT INTO dates (title, description, date_time, location, emoji) VALUES (?, ?, ?, ?, ?)').run(title, description, date_time, location, emoji);
  res.json({ id: info.lastInsertRowid, title, description, date_time, location, emoji, done: 0 });
});

app.patch('/api/dates/:id/toggle', (req, res) => {
  const row = db.prepare('SELECT done FROM dates WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE dates SET done = ? WHERE id = ?').run(row.done ? 0 : 1, req.params.id);
  res.json({ done: !row.done });
});

app.delete('/api/dates/:id', (req, res) => {
  db.prepare('DELETE FROM dates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// SAVINGS
app.get('/api/savings', (_, res) => {
  res.json(db.prepare('SELECT * FROM savings ORDER BY created DESC').all());
});

app.post('/api/savings', (req, res) => {
  const { label, target, current = 0, emoji = '💰', color = '#ff4d6d' } = req.body;
  if (!label || !target) return res.status(400).json({ error: 'label and target required' });
  const info = db.prepare('INSERT INTO savings (label, target, current, emoji, color) VALUES (?, ?, ?, ?, ?)').run(label, target, current, emoji, color);
  res.json({ id: info.lastInsertRowid, label, target, current, emoji, color });
});

app.patch('/api/savings/:id', (req, res) => {
  const { current, label, target, emoji, color } = req.body;
  const row = db.prepare('SELECT * FROM savings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE savings SET current=?, label=?, target=?, emoji=?, color=? WHERE id=?').run(
    current ?? row.current, label ?? row.label, target ?? row.target,
    emoji ?? row.emoji, color ?? row.color, req.params.id
  );
  res.json({ ok: true });
});

app.delete('/api/savings/:id', (req, res) => {
  db.prepare('DELETE FROM savings WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Static photos ──────────────────────────────────────────────────────────────
app.use('/photos', express.static(PHOTOS_DIR));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`💕 Love API running on port ${PORT}`);
});
