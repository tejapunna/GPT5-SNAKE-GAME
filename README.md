# Snake Game Developed By GPT-5

A fast, single-page Snake game built with vanilla HTML/CSS/JS. Scores persist locally using SQLite in the browser (sql.js/WASM), with an optional global leaderboard powered by Supabase for easy web publishing. No Node server required.

## Features
- Name prompt on first load (and switch anytime)
- Persistent scores:
  - Local-only (per-browser) via sql.js + localStorage
  - Optional global leaderboard via Supabase
- Top 10 scores and your personal best
- Adjustable speed (ms per tick) and selectable skins:
  - Classic Green
  - Python-style Blue/Yellow
- Keyboard controls: Arrow/WASD to move, Space to pause, Enter to restart

## How it works
- Local mode (default):
  - Uses sql.js (SQLite compiled to WebAssembly) loaded from a CDN.
  - A tiny DB with table `scores` is created in-memory and persisted to `localStorage` as base64.
  - All reads/writes stay inside the browser; each visitor gets a private leaderboard.
- Supabase mode (optional):
  - Imports `@supabase/supabase-js` via ESM CDN dynamically in the browser.
  - Score reads/writes go to a hosted Postgres table so everyone sees the same leaderboard.

## Project structure
- `index.html` — Page markup; includes config, db, and game scripts
- `styles.css` — Minimal styling and modal UI
- `config.js` — Toggle Local vs Supabase and set credentials
- `db.js` — Unified DB API (local sql.js or Supabase)
- `game.js` — Gameplay, UI bindings, speed/skin settings

## Quick start (local)
Some browsers block WASM from `file://`. If the game doesn’t start, serve the folder over HTTP.

```bash
# from the project folder
python3 -m http.server 8080
```

Open http://localhost:8080 and play.

## Configuration (global leaderboard)
Edit `config.js` and set your Supabase project credentials:

```js
window.APP_CONFIG = {
  USE_SUPABASE: true,
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_KEY',
};
```

### Supabase setup
Create a table named `scores`:

```sql
create table if not exists public.scores (
  id bigserial primary key,
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

-- Demo-only policies (allow anonymous select/insert). Tighten for production.
create policy "scores_select_all" on public.scores
  for select using (true);

create policy "scores_insert_all" on public.scores
  for insert with check (true);
```

Notes:
- For production, add validation, auth, or rate limiting.
- You can also expose an authenticated API instead of anonymous writes.

## Controls & settings
- Move: Arrow keys or WASD
- Pause/Resume: Space
- Restart after Game Over: Enter
- Speed: slider (ms per tick), persisted in `localStorage`
- Skin: Classic or Python-style, persisted in `localStorage`

## Data storage
- Local DB key: `snake_sqlite_db_v1` (when in local mode)
- Player name key: `snake_player_name_v1`

Reset local data via DevTools Console:

```js
localStorage.removeItem('snake_sqlite_db_v1');
localStorage.removeItem('snake_player_name_v1');
location.reload();
```

## Deploy
This is a static site—host anywhere:

- GitHub Pages: push files to `main`, enable Pages for the repo (root).
- Netlify/Vercel: drag-and-drop or deploy the folder as a static site.
- Any static host/CDN works.

If `USE_SUPABASE` is `false`, each visitor sees only their own local leaderboard. Set it to `true` and provide credentials for a shared leaderboard.

## Troubleshooting
- Blank board or errors when opened via double-click: serve over HTTP (WASM often blocked on `file://`).
- Leaderboard shows “Local (this browser only)” after enabling Supabase: check `config.js` values and browser console for CORS/keys.
- Supabase rate limits or RLS errors: review policies and project quotas.

---

Made with vanilla web tech and sql.js. Enjoy the game!
