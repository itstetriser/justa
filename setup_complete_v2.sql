-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  total_points int default 0,
  streak_count int default 0,
  last_active_at timestamptz default now(),
  native_lang text,
  is_premium boolean default false,
  is_admin boolean default false  -- New Admin Column
);

-- 2. RLS for Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using ( true );
create policy "Users can insert their own profile." on public.profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on public.profiles for update using ( auth.uid() = id );

-- 3. Create questions table
create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  level text check (level in ('easy', 'medium', 'hard')),
  category text,
  sentence_en text not null
);

alter table public.questions enable row level security;
drop policy if exists "Questions are viewable by everyone." on public.questions;
create policy "Questions are viewable by everyone." on public.questions for select using ( true );

-- 4. Create words table
create table if not exists public.words (
  id bigint generated always as identity primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  word_text text not null,
  is_correct boolean default false,
  translations jsonb default '{}'::jsonb, 
  explanations jsonb default '{}'::jsonb
);

alter table public.words enable row level security;
drop policy if exists "Words are viewable by everyone." on public.words;
create policy "Words are viewable by everyone." on public.words for select using ( true );

-- 5. RPC: get_random_question
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

-- 6. RPC: increment_points
create or replace function increment_points(user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set total_points = total_points + 10,
      streak_count = streak_count + 1,
      last_active_at = now()
  where id = user_id;
end;
$$;

-- 7. SEED DATA (Safe re-run)
WITH q1 AS (
  INSERT INTO public.questions (level, category, sentence_en)
  VALUES ('easy', 'grammar', 'The cat is [blank] on the mat.')
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
SELECT q1.id, 'sleeping', true, '{"tr": "Kedi paspasın üzerinde uyuyor."}'::jsonb, null FROM q1
UNION ALL
SELECT q1.id, 'sleep', false, null, '{"tr": "Burada şimdiki zaman yapısını (is + -ing) kullanmalısınız."}'::jsonb FROM q1;

-- Manual Query to make YOU an admin
-- Run this separately after table update if your profile already exists:
-- UPDATE public.profiles SET is_admin = true WHERE username = 'tetriser2!';
