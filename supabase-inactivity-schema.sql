-- Run this in Supabase SQL Editor

ALTER TABLE families
  ADD COLUMN IF NOT EXISTS inactivity_notified_at timestamptz DEFAULT NULL;

ALTER TABLE families
  ADD COLUMN IF NOT EXISTS inactivity_hours integer DEFAULT 24;
