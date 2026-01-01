-- Create user_progress table for smart tracking
create table if not exists public.user_progress (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  question_id uuid references public.questions not null,
  level text, -- cached for easier querying by level
  mistake_count int default 0,
  completed_at timestamptz default now(),
  unique(user_id, question_id) -- Critical for UPSERT support
);

-- Enable RLS
alter table public.user_progress enable row level security;

create policy "Users can manage their own progress." 
on public.user_progress 
for all 
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

-- Create index for faster level lookups
create index if not exists idx_progress_user_level on public.user_progress(user_id, level);
