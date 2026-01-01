-- FIX RPC: Make get_random_question Case-Insensitive
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS get_random_question(text);

CREATE OR REPLACE FUNCTION get_random_question(p_level text)
RETURNS SETOF questions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM questions
  WHERE LOWER(level) = LOWER(p_level) -- Handle 'Hard', 'hard', 'HARD'
  ORDER BY random()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
