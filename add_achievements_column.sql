-- Add achievements column to profiles table
-- Stores unlocked achievements as a JSONB map
-- Format: { "achievement_id": { "unlockedAt": "ISO_DATE", "progress": 100 } }

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.profiles.achievements IS 'Stores user unlocked achievements and progress';
