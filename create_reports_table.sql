-- Create a table for question reports
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  topic text not null, -- 'Spelling', 'Grammar', 'Translation', 'Other'
  message text,
  status text default 'pending', -- 'pending', 'reviewed', 'resolved'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- Enable RLS
alter table public.reports enable row level security;

-- Policy: Users can insert their own reports
create policy "Users can insert their own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

-- Policy: Users can view their own reports (optional, but good for history)
create policy "Users can view their own reports"
  on public.reports for select
  using (auth.uid() = user_id);

-- Policy: Admins/Service Role can view all (handled by service role key usually, but plain select policy for now)
-- Assuming admin checks likely done adjacent to this or via dashboard using service key.
