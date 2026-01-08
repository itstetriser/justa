ALTER TABLE public.daily_words 
ADD COLUMN IF NOT EXISTS part_of_speech TEXT;
