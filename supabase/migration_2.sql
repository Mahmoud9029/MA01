-- ============================================================
-- Migration 2: run this in Supabase SQL Editor (New query -> paste -> Run)
-- Adds: duration tracking + automatic "which day is next" pointer
-- Safe to run on your existing database — only adds columns, deletes nothing.
-- ============================================================

alter table workout_logs add column if not exists duration_minutes int;

alter table profiles add column if not exists current_phase int default 1;
alter table profiles add column if not exists current_day_index int default 0;
alter table profiles add column if not exists last_training_date date;
