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
