-- Allow authenticated users (Admins) to INSERT into 'words' table
-- Previously, only SELECT was enabled

CREATE POLICY "Users can insert words." 
ON public.words 
FOR INSERT 
WITH CHECK ( auth.role() = 'authenticated' );

CREATE POLICY "Users can update words." 
ON public.words 
FOR UPDATE 
USING ( auth.role() = 'authenticated' );

CREATE POLICY "Users can delete words." 
ON public.words 
FOR DELETE 
USING ( auth.role() = 'authenticated' );

-- Also ensure 'questions' allows insert if not already
CREATE POLICY "Users can insert questions." 
ON public.questions 
FOR INSERT 
WITH CHECK ( auth.role() = 'authenticated' );

CREATE POLICY "Users can update questions." 
ON public.questions 
FOR UPDATE 
USING ( auth.role() = 'authenticated' );

CREATE POLICY "Users can delete questions." 
ON public.questions 
FOR DELETE 
USING ( auth.role() = 'authenticated' );
