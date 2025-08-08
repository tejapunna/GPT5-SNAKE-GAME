// config.js - switch between local (sql.js) and Supabase global leaderboard
// To enable Supabase, set USE_SUPABASE to true and fill in the URL and anon key.

window.APP_CONFIG = {
  USE_SUPABASE: false,
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  // table: scores (id, name text, score int, created_at timestamptz default now())
};
