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
