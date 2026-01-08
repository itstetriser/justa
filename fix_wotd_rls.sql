-- Allow authenticated users to INSERT, UPDATE, and DELETE daily words
-- Ensure RLS is enabled
ALTER TABLE public.daily_words ENABLE ROW LEVEL SECURITY;

-- Policy for INSERT
CREATE POLICY "Allow authenticated insert"
ON public.daily_words FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for UPDATE
CREATE POLICY "Allow authenticated update"
ON public.daily_words FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for DELETE
CREATE POLICY "Allow authenticated delete"
ON public.daily_words FOR DELETE
TO authenticated
USING (true);
