-- FIX RPC: Update get_random_question to support the new JSONB 'words' column
-- Run this in Supabase SQL Editor

-- 1. Drop the old function (it might struggle with return types changing)
DROP FUNCTION IF EXISTS get_random_question(text);

-- 2. Create the new simple function
-- Since 'words' is now a column in 'questions', we don't need to join anything!
CREATE OR REPLACE FUNCTION get_random_question(p_level text)
RETURNS SETOF questions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM questions
  WHERE level = p_level
  ORDER BY random()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
