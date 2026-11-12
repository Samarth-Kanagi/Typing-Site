import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Data directory and file
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'history.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data file if it doesn't exist
if (!existsSync(DATA_FILE)) {
  writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Middleware
app.use(express.json());

// CORS for development (Vite dev server will proxy, but just in case)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ---------- Helpers ----------
function readHistory() {
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeHistory(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- Routes ----------

// GET /api/history – Retrieve all typing session history
app.get('/api/history', (req, res) => {
  const history = readHistory();
  res.json(history);
});

// POST /api/history – Save a new typing session result
app.post('/api/history', (req, res) => {
  const record = req.body;

  // Basic validation
  if (!record || typeof record.wpm !== 'number') {
    return res.status(400).json({ error: 'Invalid record data' });
  }

  const history = readHistory();

  // Add the new record at the beginning
  history.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: record.date || new Date().toISOString(),
    difficulty: record.difficulty || 'easy',
    timeLimit: Number.isFinite(record.timeLimit) ? record.timeLimit : 1,
    elapsed: Number.isFinite(record.elapsed) ? record.elapsed : 0,
    wpm: Number.isFinite(record.wpm) ? record.wpm : 0,
    cpm: Number.isFinite(record.cpm) ? record.cpm : 0,
    accuracy: Number.isFinite(record.accuracy) ? record.accuracy : 0,
    errors: Number.isFinite(record.errors) ? record.errors : 0,
    correct: Number.isFinite(record.correct) ? record.correct : 0,
    totalTyped: Number.isFinite(record.totalTyped) ? record.totalTyped : 0,
  });

  // Keep only the last 100 records
  if (history.length > 100) {
    history.length = 100;
  }

  writeHistory(history);
  res.json(history);
});

// DELETE /api/history – Clear all history
app.delete('/api/history', (req, res) => {
  writeHistory([]);
  res.json([]);
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`\n  🚀  TypeFlow API server running at http://localhost:${PORT}\n`);
});
