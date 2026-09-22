-- ============================================================
-- Migration 3: run in Supabase SQL Editor (New query -> paste -> Run)
-- Adds: a persisted "active session" (so the timer survives the phone
-- backgrounding/killing the tab) + saved exercise substitutions.
-- Safe to run on your existing database.
-- ============================================================

-- Active session: only one per user. Created when "Training starten" is
-- pressed, deleted when "Training beenden" is pressed. Because started_at
-- is a real timestamp saved in the database, the elapsed time is always
-- calculated as (now - started_at) — even if the app was closed and
-- reopened, the correct duration is recovered.
create table if not exists active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phase int not null,
  day_index int not null,
  started_at timestamptz not null
);
alter table active_sessions enable row level security;
create policy "own active session" on active_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Exercise overrides: when the user picks an alternative exercise for a
-- given plan slot (phase + day + item position), it's saved here and used
-- instead of the plan's default exercise from then on.
create table if not exists exercise_overrides (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  phase int not null,
  day_index int not null,
  item_index int not null,
  exercise_name text not null,
  unique (user_id, phase, day_index, item_index)
);
alter table exercise_overrides enable row level security;
create policy "own exercise overrides" on exercise_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
