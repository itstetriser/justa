-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  total_points int default 0,
  streak_count int default 0,
  last_active_at timestamptz default now(),
  native_lang text,
  is_premium boolean default false
);

-- Client side access policies for profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using ( true );
create policy "Users can insert their own profile." on public.profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on public.profiles for update using ( auth.uid() = id );

-- Create questions table
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  level text check (level in ('easy', 'medium', 'hard')),
  category text,
  sentence_en text not null -- Contains [blank] placeholder
);

alter table public.questions enable row level security;
create policy "Questions are viewable by everyone." on public.questions for select using ( true );

-- Create words table
create table public.words (
  id bigint generated always as identity primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  word_text text not null,
  is_correct boolean default false,
  translations jsonb default '{}'::jsonb, -- Keys: tr, ar, es, jp, cn, de, pt, fr
  explanations jsonb default '{}'::jsonb
);

alter table public.words enable row level security;
create policy "Words are viewable by everyone." on public.words for select using ( true );

-- RPC: get_random_question
-- Returns one random question of the given level, with aggregated words
create or replace function get_random_question(p_level text)
returns table (
  id uuid,
  level text,
  category text,
  sentence_en text,
  words jsonb
)
language plpgsql
as $$
begin
  return query
  select
    q.id,
    q.level,
    q.category,
    q.sentence_en,
    jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'word_text', w.word_text,
        'is_correct', w.is_correct,
        'translations', w.translations,
        'explanations', w.explanations
      )
    ) as words
  from
    public.questions q
  join
    public.words w on q.id = w.question_id
  where
    q.level = p_level
  group by
    q.id
  order by
    random()
  limit 1;
end;
$$;
