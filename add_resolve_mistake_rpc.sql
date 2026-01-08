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
