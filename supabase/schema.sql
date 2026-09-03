-- ============================================================
-- Trainingsnotizen: Supabase schema
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================

-- Profile: current weight/height per user
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  weight numeric,
  height numeric,
  updated_at timestamptz default now()
);

-- Weight history: one row per date, tracks the trend toward the goal weight
create table if not exists weight_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  weight numeric,
  height numeric,
  unique (user_id, date)
);

-- Workout logs: one row per date + phase + day, holds the checklist/weights snapshot
create table if not exists workout_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  phase int not null,
  day_index int not null,
  title text,
  items jsonb not null default '[]',
  calories int,
  unique (user_id, date, phase, day_index)
);

-- Exercise photos: replaces the auto-icon once the user takes a photo (persists across weeks)
create table if not exists exercise_photos (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  phase int not null,
  day_index int not null,
  item_index int not null,
  photo_url text not null,
  unique (user_id, phase, day_index, item_index)
);

-- ============================================================
-- Row Level Security: every user can only see/edit their OWN rows
-- ============================================================
alter table profiles enable row level security;
alter table weight_logs enable row level security;
alter table workout_logs enable row level security;
alter table exercise_photos enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own weight logs" on weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own workout logs" on workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own exercise photos" on exercise_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Storage bucket for exercise photos
-- (Run this too, or create the bucket manually in Dashboard -> Storage)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('exercise-photos', 'exercise-photos', true)
on conflict (id) do nothing;

create policy "users upload their own photos"
  on storage.objects for insert
  with check (bucket_id = 'exercise-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users read their own photos"
  on storage.objects for select
  using (bucket_id = 'exercise-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users update their own photos"
  on storage.objects for update
  using (bucket_id = 'exercise-photos' and auth.uid()::text = (storage.foldername(name))[1]);
