-- 1. FIX: get_detailed_stats (Robust Word Counting from JSON)
CREATE OR REPLACE FUNCTION get_detailed_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_questions_seen int := 0;
  v_questions_correct int := 0;
  v_words_seen int := 0;
  v_level_breakdown jsonb;
BEGIN
  -- Sum lengths of seen_ids arrays
  SELECT COALESCE(SUM(jsonb_array_length(seen_ids)), 0) INTO v_questions_seen FROM user_level_progress WHERE user_id = p_user_id;

  -- Sum lengths of correct_ids arrays
  SELECT COALESCE(SUM(jsonb_array_length(correct_ids)), 0) INTO v_questions_correct FROM user_level_progress WHERE user_id = p_user_id;
  
  -- Count UNIQUE CORRECT words for seen questions
  -- Logic matches GameScreen: Looking into 'questions' table JSON columns 'words' or 'word_pool'
  WITH seen_q AS (
      SELECT jsonb_array_elements_text(seen_ids) as q_id
      FROM user_level_progress
      WHERE user_id = p_user_id
  )
  SELECT COUNT(*) 
  INTO v_words_seen
  FROM seen_q
  JOIN questions q ON q.id::text = seen_q.q_id
  CROSS JOIN LATERAL jsonb_array_elements(
      CASE 
          WHEN q.words IS NOT NULL AND jsonb_typeof(q.words) = 'array' THEN q.words
          ELSE '[]'::jsonb 
      END
  ) as w_obj
  WHERE (w_obj->>'is_correct')::boolean = true;

  -- Level Breakdown
  SELECT jsonb_object_agg(level, jsonb_array_length(seen_ids)) INTO v_level_breakdown FROM user_level_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'questions_seen_total', v_questions_seen, 
    'questions_correct_total', v_questions_correct, 
    'words_seen_total', v_words_seen, 
    'level_breakdown', v_level_breakdown
  );
END;
$$;

-- 2. FIX: update_points (Ensures scoring works)
CREATE OR REPLACE FUNCTION public.update_points(user_id uuid, delta int, local_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_daily int;
  current_total int;
  last_date date;
BEGIN
  SELECT COALESCE(score_daily, 0), COALESCE(total_points, 0), COALESCE(last_score_date, '2000-01-01')::date
  INTO current_daily, current_total, last_date 
  FROM public.profiles WHERE id = user_id;

  IF last_date < local_date THEN current_daily := 0; END IF;

  UPDATE public.profiles
  SET total_points = current_total + delta, score_daily = current_daily + delta, last_score_date = now()
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_detailed_stats TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION update_points(uuid, int, date) TO authenticated, service_role, anon;
