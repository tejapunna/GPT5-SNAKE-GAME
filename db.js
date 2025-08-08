// db.js - Local SQLite via sql.js (WASM) or optional Supabase global leaderboard
// API: init(), setPlayer(name), getPlayer(), saveScore(score), getTop(limit), getBestForPlayer(name), backend()

const DB_STORAGE_KEY = 'snake_sqlite_db_v1';
const DB_PLAYER_KEY = 'snake_player_name_v1';

const ScoresDB = (() => {
  let SQL; // sql.js module
  let db;  // Database instance
  let mode = 'local'; // 'local' | 'supabase'

  async function loadSQL() {
    if (SQL) return SQL;
    // sql.js looks for the wasm file at locateFile path
    SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
    });
    return SQL;
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEY);
      if (!raw) return null;
      const arr = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      return new SQL.Database(arr);
    } catch (e) {
      console.warn('Failed to load DB from storage, creating new DB.', e);
      return null;
    }
  }

  function saveToStorage() {
    try {
      const binary = db.export();
      const raw = btoa(String.fromCharCode.apply(null, binary));
      localStorage.setItem(DB_STORAGE_KEY, raw);
    } catch (e) {
      console.error('Failed to persist DB:', e);
    }
  }

  function initSchema() {
    db.run(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_scores_name_score ON scores(name, score DESC);
    `);
  }

  async function init() {
    // Prefer Supabase if configured
    if (window.APP_CONFIG?.USE_SUPABASE && window.APP_CONFIG.SUPABASE_URL && window.APP_CONFIG.SUPABASE_ANON_KEY) {
      mode = 'supabase';
      return; // no local init needed
    }
    await loadSQL();
    db = loadFromStorage() || new SQL.Database();
    initSchema();
    saveToStorage();
  }

  function setPlayer(name) {
    if (!name || !name.trim()) return;
    localStorage.setItem(DB_PLAYER_KEY, name.trim());
  }

  function getPlayer() {
    return localStorage.getItem(DB_PLAYER_KEY) || '';
  }

  async function saveScore(score) {
    if (!Number.isFinite(score)) return;
    const name = getPlayer() || 'Anonymous';
    if (mode === 'supabase') {
      // dynamic import to avoid bundling
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);
      await supabase.from('scores').insert({ name, score: Math.floor(score) });
      return;
    }
    const stmt = db.prepare('INSERT INTO scores (name, score) VALUES (?, ?)');
    stmt.run([name, Math.floor(score)]);
    stmt.free();
    saveToStorage();
  }

  async function getTop(limit = 10) {
    if (mode === 'supabase') {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);
      const { data, error } = await supabase
        .from('scores')
        .select('name, score, created_at')
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) {
        console.error('Supabase getTop error', error);
        return [];
      }
      return data || [];
    }
    const stmt = db.prepare('SELECT name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT ?');
    const rows = [];
    stmt.bind([limit]);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  async function getBestForPlayer(name) {
    if (mode === 'supabase') {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);
      const { data, error } = await supabase
        .from('scores')
        .select('score')
        .eq('name', name)
        .order('score', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) return 0;
      return data[0].score || 0;
    }
    const stmt = db.prepare('SELECT MAX(score) as best FROM scores WHERE name = ?');
    stmt.bind([name]);
    let best = 0;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      best = row.best || 0;
    }
    stmt.free();
    return best;
  }

  function backend(){
    return mode;
  }

  return { init, setPlayer, getPlayer, saveScore, getTop, getBestForPlayer, backend };
})();

// Expose globally for game.js
window.ScoresDB = ScoresDB;
