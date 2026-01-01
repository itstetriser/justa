-- ⚠️ THIS WILL CLEAR QUESTIONS AND WORDS TO FIX THE "NO WORDS" BUG
-- It will NOT delete User Profiles or Points.

-- 1. DELETE EXISTING GAME DATA
TRUNCATE TABLE public.words CASCADE;
TRUNCATE TABLE public.questions CASCADE;

-- 2. INSERT FRESH DATA (Using explicit IDs to ensure relationships work 100%)

-- Example 1: Easy
INSERT INTO public.questions (id, level, category, sentence_en)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'easy', 'grammar', 'The cat is [blank] on the mat.');

INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'sleeping', true, '{"tr": "Kedi paspasın üzerinde uyuyor."}'::jsonb, null),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'sleep', false, null, '{"tr": "Burada şimdiki zaman yapısını (is + -ing) kullanmalısınız."}'::jsonb);

-- Example 2: Medium
INSERT INTO public.questions (id, level, category, sentence_en)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'medium', 'vocabulary', 'She decided to [blank] the red dress for the party.');

INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'wear', true, '{"tr": "Parti için kırmızı elbiseyi giymeye karar verdi."}'::jsonb, null),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'where', false, null, '{"tr": "\"Where\" bir yer belirtir. \"Wear\" (giymek) demek istediniz."}'::jsonb);

-- Example 3: Hard (Your Example)
INSERT INTO public.questions (id, level, category, sentence_en)
VALUES ('a7b8c9d0-e1f2-4a1b-b2c3-d4e5f6a7b8c9', 'hard', 'Academic Writing', 'The theory remains [blank] despite numerous attempts to disprove it.');

INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES
('a7b8c9d0-e1f2-4a1b-b2c3-d4e5f6a7b8c9', 'tenable', true, '{"tr": "savunulabilir"}'::jsonb, null),
('a7b8c9d0-e1f2-4a1b-b2c3-d4e5f6a7b8c9', 'viable', true, '{"tr": "uygulanabilir"}'::jsonb, null),
('a7b8c9d0-e1f2-4a1b-b2c3-d4e5f6a7b8c9', 'plausible', true, '{"tr": "makul"}'::jsonb, null),
('a7b8c9d0-e1f2-4a1b-b2c3-d4e5f6a7b8c9', 'liquid', false, null, '{"tr": "Sıvı demektir."}'::jsonb);

-- Verify Admin Column (Just in case you missed it)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
