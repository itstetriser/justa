-- FIX: Reset all progress to clear "ghost" question IDs
-- This will fix the "Words Seen: 0" issue by removing references to deleted questions.
TRUNCATE TABLE public.user_level_progress;

-- Optional: Reset score if you want a complete fresh start (commented out by default)
-- UPDATE public.profiles SET total_points = 0, streak_count = 0 WHERE id = 'YOUR_USER_ID';
