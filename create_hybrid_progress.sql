-- Create the Hybrid Progress Table
CREATE TABLE IF NOT EXISTS public.user_level_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    level TEXT NOT NULL,
    seen_ids UUID[] DEFAULT '{}',
    favorite_ids UUID[] DEFAULT '{}',
    mistakes JSONB DEFAULT '{}'::jsonb,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, level)
);

-- RLS Policies
ALTER TABLE public.user_level_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
ON public.user_level_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.user_level_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_level_progress FOR UPDATE
USING (auth.uid() = user_id);

-- RPC: Mark as Seen
-- Appends question_id to seen_ids if not present
CREATE OR REPLACE FUNCTION mark_question_seen(
    p_user_id UUID,
    p_level TEXT,
    p_question_id UUID
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_level_progress (user_id, level, seen_ids)
    VALUES (p_user_id, p_level, ARRAY[p_question_id])
    ON CONFLICT (user_id, level)
    DO UPDATE SET
        seen_ids = (
            CASE 
                WHEN NOT (user_level_progress.seen_ids @> ARRAY[p_question_id]) 
                THEN user_level_progress.seen_ids || p_question_id 
                ELSE user_level_progress.seen_ids 
            END
        ),
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Toggle Favorite
-- Adds or Removes ID from favorite_ids
CREATE OR REPLACE FUNCTION toggle_question_favorite(
    p_user_id UUID,
    p_level TEXT,
    p_question_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_fav BOOLEAN;
BEGIN
    -- Check if currently favorite
    SELECT (favorite_ids @> ARRAY[p_question_id]) INTO is_fav
    FROM public.user_level_progress
    WHERE user_id = p_user_id AND level = p_level;

    IF is_fav THEN
        -- Remove
        UPDATE public.user_level_progress
        SET favorite_ids = array_remove(favorite_ids, p_question_id),
            last_updated = NOW()
        WHERE user_id = p_user_id AND level = p_level;
        RETURN FALSE;
    ELSE
        -- Add (Insert if not exists)
        INSERT INTO public.user_level_progress (user_id, level, favorite_ids)
        VALUES (p_user_id, p_level, ARRAY[p_question_id])
        ON CONFLICT (user_id, level)
        DO UPDATE SET
            favorite_ids = user_level_progress.favorite_ids || p_question_id,
            last_updated = NOW();
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Record Mistake
-- Increments mistake count in JSONB
CREATE OR REPLACE FUNCTION record_question_mistake(
    p_user_id UUID,
    p_level TEXT,
    p_question_id UUID
)
RETURNS VOID AS $$
DECLARE
    current_count INTEGER;
    current_mistakes JSONB;
BEGIN
    -- Get current mistakes
    SELECT mistakes INTO current_mistakes
    FROM public.user_level_progress
    WHERE user_id = p_user_id AND level = p_level;

    IF current_mistakes IS NULL THEN
        current_mistakes := '{}'::jsonb;
    END IF;

    -- Get current count for this question (default 0)
    current_count := COALESCE((current_mistakes->>p_question_id::text)::INTEGER, 0);

    -- Increment
    current_count := current_count + 1;

    -- Upsert
    INSERT INTO public.user_level_progress (user_id, level, mistakes)
    VALUES (p_user_id, p_level, jsonb_build_object(p_question_id::text, current_count))
    ON CONFLICT (user_id, level)
    DO UPDATE SET
        mistakes = jsonb_set(
            COALESCE(user_level_progress.mistakes, '{}'::jsonb),
            ARRAY[p_question_id::text],
            to_jsonb(current_count)
        ),
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Resolve Mistake (Remove from list)
-- Called when user answers correctly without error
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
