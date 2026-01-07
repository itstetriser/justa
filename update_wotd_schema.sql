-- Add part_of_speech column to daily_words table
ALTER TABLE public.daily_words 
ADD COLUMN IF NOT EXISTS part_of_speech TEXT;

-- Verify policy (ensure authenticated users can insert/update)
-- Running this again to be safe:
DROP POLICY IF EXISTS "Authenticated users can insert daily words" ON public.daily_words;
CREATE POLICY "Authenticated users can insert daily words"
ON public.daily_words FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update daily words" ON public.daily_words;
CREATE POLICY "Authenticated users can update daily words"
ON public.daily_words FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete daily words" ON public.daily_words;
CREATE POLICY "Authenticated users can delete daily words"
ON public.daily_words FOR DELETE
TO authenticated
USING (true);
