-- ═══════════════════════════════════════════
--  ChroMind — Supabase SQL Setup
--  Colle ce script dans :
--  Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════

-- 1. Table profils joueurs
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table sauvegardes de jeu
CREATE TABLE IF NOT EXISTS game_saves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  coins       INTEGER DEFAULT 0,
  best        INTEGER DEFAULT 0,
  games       INTEGER DEFAULT 0,
  streak      INTEGER DEFAULT 0,
  owned_skins TEXT[]  DEFAULT ARRAY['classic'],
  equipped    TEXT    DEFAULT 'classic',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security — chaque joueur voit uniquement ses données
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;

-- Profiles : lecture publique (pseudo visible leaderboard), écriture = soi uniquement
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Game saves : visible et modifiable uniquement par le propriétaire
CREATE POLICY "saves_select_own"  ON game_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saves_insert_own"  ON game_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saves_update_own"  ON game_saves FOR UPDATE USING (auth.uid() = user_id);

-- 4. Leaderboard view (top 50 joueurs, public)
CREATE OR REPLACE VIEW leaderboard AS
  SELECT p.username, g.best, g.games
  FROM game_saves g
  JOIN profiles p ON p.id = g.user_id
  ORDER BY g.best DESC
  LIMIT 50;

-- 5. Fonction auto-création save quand nouveau joueur
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO game_saves (user_id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════
--  GOOGLE AUTH — à faire dans le dashboard :
--  Authentication → Providers → Google → Enable
--  Ajoute ton Client ID + Secret Google OAuth
--  Redirect URL : https://TON-URL.supabase.co/auth/v1/callback
-- ═══════════════════════════════════════════
