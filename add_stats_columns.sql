-- Add statistics columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS times_asked int DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_correct int DEFAULT 0;

-- Add statistics columns to words table
ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS times_picked int DEFAULT 0;

-- RPC to atomically record stats
CREATE OR REPLACE FUNCTION record_answer_stats(
  p_question_id uuid,
  p_word_id bigint,
  p_is_correct boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Increment Question 'times_asked'
  UPDATE public.questions
  SET times_asked = times_asked + 1,
      times_correct = CASE WHEN p_is_correct THEN times_correct + 1 ELSE times_correct END
  WHERE id = p_question_id;

  -- 2. Increment Word 'times_picked'
  UPDATE public.words
  SET times_picked = times_picked + 1
  WHERE id = p_word_id;
END;
$$;

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
