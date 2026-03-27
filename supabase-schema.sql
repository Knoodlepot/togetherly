-- Togetherly — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query

-- 1. Families table (one row per family group)
CREATE TABLE families (
  code             TEXT PRIMARY KEY,
  user_name        TEXT NOT NULL DEFAULT '',
  current_mood     TEXT,
  active_needs     TEXT[] DEFAULT '{}',
  sos_active       BOOLEAN DEFAULT FALSE,
  last_checkin_type TEXT,
  last_checkin_at  TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Check-ins table (history log)
CREATE TABLE checkins (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_code  TEXT REFERENCES families(code) ON DELETE CASCADE,
  type         TEXT NOT NULL,  -- 'okay' | 'help' | 'sos' | 'mood' | 'needs'
  mood         TEXT,
  needs        TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkins_family ON checkins(family_code, created_at DESC);

-- 3. Enable real-time on families table
ALTER PUBLICATION supabase_realtime ADD TABLE families;

-- 4. Row Level Security
--    The family code acts as the access token — no user auth needed.
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read families"   ON families FOR SELECT USING (true);
CREATE POLICY "Public insert families" ON families FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update families" ON families FOR UPDATE USING (true);

CREATE POLICY "Public read checkins"   ON checkins FOR SELECT USING (true);
CREATE POLICY "Public insert checkins" ON checkins FOR INSERT WITH CHECK (true);

-- 5. Auto-update updated_at on families
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
