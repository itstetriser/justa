-- DROP existing table and functions to clear conflicts
DROP TABLE IF EXISTS public.user_level_progress CASCADE;
DROP FUNCTION IF EXISTS mark_question_seen(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS toggle_question_favorite(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS record_question_mistake(UUID, TEXT, INTEGER);
