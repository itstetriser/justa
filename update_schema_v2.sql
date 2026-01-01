-- Add time-based score columns
alter table public.profiles 
add column if not exists score_daily int default 0,
add column if not exists score_weekly int default 0,
add column if not exists score_monthly int default 0,
add column if not exists last_score_date timestamptz default now();

-- Create index for leaderboard sorting
create index if not exists idx_profiles_score_weekly on public.profiles(score_weekly desc);
