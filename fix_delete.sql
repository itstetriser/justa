-- 1. Fix the specific error by deleting related data first
DELETE FROM public.user_progress WHERE question_id = '176177d4-8c51-4eb1-82c7-b54c730d59f7';
DELETE FROM public.questions WHERE id = '176177d4-8c51-4eb1-82c7-b54c730d59f7';

-- 2. (Optional but Recommended) Fix the schema so this doesn't happen again
-- This alters the user_progress table to automatically delete progress if a question is deleted.

ALTER TABLE public.user_progress 
DROP CONSTRAINT user_progress_question_id_fkey;

ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_question_id_fkey
FOREIGN KEY (question_id)
REFERENCES public.questions(id)
ON DELETE CASCADE;
