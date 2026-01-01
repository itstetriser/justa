-- Add app_lang for UI Language (keeping native_lang for Content/Explanations)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS app_lang text DEFAULT 'en';

-- Ensure native_lang exists (it should, but good practice)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS native_lang text DEFAULT 'tr';
