-- Fix casing: Convert all levels to uppercase to match UI (c2 -> C2)
UPDATE public.questions SET level = UPPER(level);
