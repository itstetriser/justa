-- 1. Add correct_ids column
ALTER TABLE public.user_level_progress
ADD COLUMN IF NOT EXISTS correct_ids JSONB DEFAULT '[]'::jsonb;

-- 2. Backfill correct_ids
-- Logic: correct_ids = seen_ids - keys(mistakes)
UPDATE public.user_level_progress
SET correct_ids = COALESCE(
    (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements_text(seen_ids) as elem
        WHERE mistakes IS NULL OR NOT (mistakes ? elem)
    ),
    '[]'::jsonb
);

-- 3. Create/Replace RPC for completing a question
-- This replaces the separate "mark_seen" and "resolve_mistake" calls with one atomic operation
CREATE OR REPLACE FUNCTION mark_question_completed(
    p_user_id UUID,
    p_level TEXT,
    p_question_id UUID,
    p_is_perfect BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    q_id_text TEXT := p_question_id::text;
    target_json JSONB := jsonb_build_array(q_id_text);
BEGIN
    -- 1. Ensure row exists (UPSERT)
    INSERT INTO public.user_level_progress (user_id, level, seen_ids, correct_ids, mistakes)
    VALUES (
        p_user_id, 
        p_level, 
        target_json, 
        CASE WHEN p_is_perfect THEN target_json ELSE '[]'::jsonb END,
        '{}'::jsonb
    )
    ON CONFLICT (user_id, level)
    DO UPDATE SET
        seen_ids = (
            CASE 
                WHEN NOT (COALESCE(user_level_progress.seen_ids, '[]'::jsonb) @> target_json) 
                THEN COALESCE(user_level_progress.seen_ids, '[]'::jsonb) || target_json 
                ELSE COALESCE(user_level_progress.seen_ids, '[]'::jsonb) 
            END
        ),
        last_updated = NOW();

    -- 2. Handle Perfect vs Imperfect
    IF p_is_perfect THEN
        -- Add to correct_ids (if not present)
        UPDATE public.user_level_progress
        SET correct_ids = (
            CASE 
                WHEN NOT (COALESCE(correct_ids, '[]'::jsonb) @> target_json) 
                THEN COALESCE(correct_ids, '[]'::jsonb) || target_json 
                ELSE COALESCE(correct_ids, '[]'::jsonb) 
            END
        ),
        -- Remove from mistakes (Resolution)
        mistakes = mistakes - q_id_text
        WHERE user_id = p_user_id AND level = p_level;
    ELSE
        -- Ensure removed from correct_ids (if somehow there)
        UPDATE public.user_level_progress
        SET correct_ids = (
            CASE 
                WHEN (COALESCE(correct_ids, '[]'::jsonb) @> target_json) 
                THEN (
                    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                    FROM jsonb_array_elements(correct_ids) as elem
                    WHERE elem::text != ('"' || q_id_text || '"')
                )
                ELSE COALESCE(correct_ids, '[]'::jsonb)
            END
        )
        WHERE user_id = p_user_id AND level = p_level;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.mark_question_completed(uuid, text, uuid, boolean) TO postgres;
GRANT EXECUTE ON FUNCTION public.mark_question_completed(uuid, text, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_question_completed(uuid, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_question_completed(uuid, text, uuid, boolean) TO service_role;
