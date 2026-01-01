-- Add daily_goal column to profiles table
alter table public.profiles 
add column if not exists daily_goal int default 100;
