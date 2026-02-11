-- ==========================================
-- PART 1: ADD STATS COLUMNS TO QUESTIONS
-- ==========================================

-- Add statistics columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS times_asked int DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_correct int DEFAULT 0;

-- Add statistics columns to words table
ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS times_picked int DEFAULT 0;

-- Update get_random_question to return stats
DROP FUNCTION IF EXISTS get_random_question(text);

create or replace function get_random_question(p_level text)
returns table (
  id uuid,
  level text,
  category text,
  sentence_en text,
  times_asked int,
  times_correct int,
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
    q.times_asked,
    q.times_correct,
    jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'word_text', w.word_text,
        'is_correct', w.is_correct,
        'translations', w.translations,
        'explanations', w.explanations,
        'times_picked', w.times_picked
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


-- ==========================================
-- PART 2: MIGRATE PROGRESS TO JSONB
-- ==========================================

-- 1. Alter Table: Convert UUID[] columns to JSONB
-- This preserves existing data by converting duplicate UUID arrays to JSON arrays of strings.

ALTER TABLE public.user_level_progress
    ALTER COLUMN seen_ids DROP DEFAULT,
    ALTER COLUMN favorite_ids DROP DEFAULT;

ALTER TABLE public.user_level_progress
    ALTER COLUMN seen_ids TYPE JSONB USING to_jsonb(seen_ids),
    ALTER COLUMN favorite_ids TYPE JSONB USING to_jsonb(favorite_ids);

ALTER TABLE public.user_level_progress
    ALTER COLUMN seen_ids SET DEFAULT '[]'::jsonb,
    ALTER COLUMN favorite_ids SET DEFAULT '[]'::jsonb;

-- 2. Update Functions to use JSONB operators

-- MARK SEEN (JSONB)
CREATE OR REPLACE FUNCTION mark_question_seen(
    p_user_id UUID,
    p_level TEXT,
    p_question_id UUID
)
RETURNS VOID AS $$
DECLARE
    q_id_text TEXT := p_question_id::text;
    target_json JSONB := jsonb_build_array(q_id_text);
BEGIN
    INSERT INTO public.user_level_progress (user_id, level, seen_ids)
    VALUES (p_user_id, p_level, target_json)
    ON CONFLICT (user_id, level)
    DO UPDATE SET
        seen_ids = (
            CASE 
                -- Check if ID (as string) is already in the JSONB array
                WHEN NOT (user_level_progress.seen_ids @> target_json) 
                THEN user_level_progress.seen_ids || target_json 
                ELSE user_level_progress.seen_ids 
            END
        ),
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TOGGLE FAVORITE (JSONB)
CREATE OR REPLACE FUNCTION toggle_question_favorite(
    p_user_id UUID,
    p_level TEXT,
    p_question_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_fav BOOLEAN;
    q_id_text TEXT := p_question_id::text;
    target_json JSONB := jsonb_build_array(q_id_text);
BEGIN
    -- Check if currently favorite using JSONB containment
    SELECT (favorite_ids @> target_json) INTO is_fav
    FROM public.user_level_progress
    WHERE user_id = p_user_id AND level = p_level;

    -- Handle case where row doesn't exist yet
    IF is_fav IS NULL THEN
        is_fav := FALSE;
    END IF;

    IF is_fav THEN
        -- Remove: In JSONB, the '-' operator removes a string element from an array
        UPDATE public.user_level_progress
        SET favorite_ids = favorite_ids - q_id_text,
            last_updated = NOW()
        WHERE user_id = p_user_id AND level = p_level;
        RETURN FALSE;
    ELSE
        -- Add (Insert if not exists)
        INSERT INTO public.user_level_progress (user_id, level, favorite_ids)
        VALUES (p_user_id, p_level, target_json)
        ON CONFLICT (user_id, level)
        DO UPDATE SET
            favorite_ids = user_level_progress.favorite_ids || target_json,
            last_updated = NOW();
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RECORD MISTAKE (No Schema Change Needed, but verifying)
-- mistakes is already JSONB, so this stays largely the same, 
-- but ensuring we treat p_question_id as key safely.
CREATE OR REPLACE FUNCTION record_question_mistake(
    p_user_id UUID,
    p_level TEXT,
    p_question_id UUID
)
RETURNS VOID AS $$
DECLARE
    current_count INTEGER;
    current_mistakes JSONB;
    q_key TEXT := p_question_id::text;
BEGIN
    -- Get current mistakes
    SELECT mistakes INTO current_mistakes
    FROM public.user_level_progress
    WHERE user_id = p_user_id AND level = p_level;

    IF current_mistakes IS NULL THEN
        current_mistakes := '{}'::jsonb;
    END IF;

    -- Get current count for this question (default 0)
    current_count := COALESCE((current_mistakes->>q_key)::INTEGER, 0);

    -- Increment
    current_count := current_count + 1;

    -- Upsert
    INSERT INTO public.user_level_progress (user_id, level, mistakes)
    VALUES (p_user_id, p_level, jsonb_build_object(q_key, current_count))
    ON CONFLICT (user_id, level)
    DO UPDATE SET
        mistakes = jsonb_set(
            COALESCE(user_level_progress.mistakes, '{}'::jsonb),
            ARRAY[q_key],
            to_jsonb(current_count)
        ),
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RESOLVE MISTAKE
CREATE OR REPLACE FUNCTION resolve_question_mistake(
    p_user_id UUID,
    p_level TEXT,
    p_question_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_level_progress
    SET mistakes = mistakes - p_question_id::text,
        last_updated = NOW()
    WHERE user_id = p_user_id AND level = p_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- PART 3: CREATE WORD STATS TABLE
-- ==========================================

-- 1. Create a side-car table for tracking word stats
create table if not exists public.word_stats (
  id bigint generated always as identity primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  word_text text not null,
  times_picked int default 1,
  unique(question_id, word_text)
);

alter table public.word_stats enable row level security;

-- Policies (Drop first to avoid errors)
drop policy if exists "Word stats viewable by everyone" on public.word_stats;
drop policy if exists "Word stats insertable by service role" on public.word_stats;
drop policy if exists "Word stats updateable by service role" on public.word_stats;

create policy "Word stats viewable by everyone" on public.word_stats for select using (true);
create policy "Word stats insertable by service role" on public.word_stats for insert with check (true);
create policy "Word stats updateable by service role" on public.word_stats for update using (true);

-- 2. Update RPC to use this new table
DROP FUNCTION IF EXISTS record_answer_stats(uuid, text, boolean);

create or replace function record_answer_stats(
  p_question_id uuid,
  p_word_text text,
  p_is_correct boolean,
  p_increment_asked boolean default true
)
returns void
language plpgsql
security definer
as $$
begin
  -- 1. Increment Question 'times_asked'
  -- Only increment if p_increment_asked is true
  update public.questions
  set times_asked = coalesce(times_asked, 0) + (case when p_increment_asked then 1 else 0 end),
      times_correct = case when p_is_correct then coalesce(times_correct, 0) + 1 else coalesce(times_correct, 0) end
  where id = p_question_id;

  -- 2. Increment Word Stats (Upsert)
  insert into public.word_stats (question_id, word_text, times_picked)
  values (p_question_id, p_word_text, 1)
  on conflict (question_id, word_text)
  do update set times_picked = word_stats.times_picked + 1;
end;
$$;


-- ==========================================
-- PART 4: GET USER STATS RPC (The likely cause of the hang)
-- ==========================================

-- RPC: Get User Stats
-- returns combined stats for the user:
-- 1. questions_seen: count of distinct question IDs in user_level_progress
-- 2. words_seen: sum of array_length of words jsonb for those questions

create or replace function public.get_user_stats(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_questions_seen int;
  v_words_seen int;
begin
  -- 1. Get all seen question IDs across all levels
  -- user_level_progress has seen_ids array. We need to unnest them.
  with all_seen as (
    select distinct jsonb_array_elements_text(seen_ids)::uuid as q_id
    from public.user_level_progress
    where user_id = p_user_id
  )
  select
    count(distinct q.id),
    coalesce(sum(jsonb_array_length(q.words)), 0)
  into
    v_questions_seen,
    v_words_seen
  from
    all_seen s
  join
    public.questions q on s.q_id = q.id;

  return jsonb_build_object(
    'questions_seen', coalesce(v_questions_seen, 0),
    'words_seen', coalesce(v_words_seen, 0)
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO service_role;
