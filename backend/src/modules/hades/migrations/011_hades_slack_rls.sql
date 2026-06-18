-- Migration 011: Enable RLS on hades_slack_connections
-- Run this in Supabase SQL editor

ALTER TABLE public.hades_slack_connections ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own connections
CREATE POLICY "Users view own slack connections"
  ON public.hades_slack_connections
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt()->>'sub' = user_id);

-- Allow users to insert their own connections
CREATE POLICY "Users insert own slack connections"
  ON public.hades_slack_connections
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR auth.jwt()->>'sub' = user_id);

-- Allow users to update their own connections
CREATE POLICY "Users update own slack connections"
  ON public.hades_slack_connections
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.jwt()->>'sub' = user_id);

-- Allow users to delete their own connections
CREATE POLICY "Users delete own slack connections"
  ON public.hades_slack_connections
  FOR DELETE
  USING (auth.uid()::text = user_id OR auth.jwt()->>'sub' = user_id);
