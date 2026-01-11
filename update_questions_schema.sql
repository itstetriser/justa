-- Add metadata columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Comment on columns
COMMENT ON COLUMN public.questions.created_at IS 'Timestamp when the question was added';
COMMENT ON COLUMN public.questions.is_active IS 'Whether the question is active (visible in game)';

-- Drop restrictive check constraint on level to allow A1, A2, etc.
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_level_check;
