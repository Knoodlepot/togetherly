-- Run this in Supabase SQL Editor

CREATE TABLE push_subscriptions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_code  text NOT NULL,
  endpoint     text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert subscriptions"
  ON push_subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read subscriptions"
  ON push_subscriptions FOR SELECT USING (true);

CREATE POLICY "Anyone can delete subscriptions"
  ON push_subscriptions FOR DELETE USING (true);
