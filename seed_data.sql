-- Example 1: Easy Grammar
WITH q1 AS (
  INSERT INTO public.questions (level, category, sentence_en)
  VALUES ('easy', 'grammar', 'The cat is [blank] on the mat.')
  RETURNING id
)
INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES
( (SELECT id FROM q1), 'sleeping', true, '{"tr": "Kedi paspasın üzerinde uyuyor."}'::jsonb, null ),
( (SELECT id FROM q1), 'sleep', false, null, '{"tr": "Burada şimdiki zaman yapısını (is + -ing) kullanmalısınız."}'::jsonb );

-- Example 2: Medium Vocabulary
WITH q2 AS (
  INSERT INTO public.questions (level, category, sentence_en)
  VALUES ('medium', 'vocabulary', 'She decided to [blank] the red dress for the party.')
  RETURNING id
)
INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES
( (SELECT id FROM q2), 'wear', true, '{"tr": "Parti için kırmızı elbiseyi giymeye karar verdi."}'::jsonb, null ),
( (SELECT id FROM q2), 'where', false, null, '{"tr": "\"Where\" bir yer belirtir. \"Wear\" (giymek) demek istediniz."}'::jsonb );

-- Example 3: Hard Legal English (User Provided)
-- ID: 103877dd-c173-4c4e-9f69-1c5aae5507f8
INSERT INTO public.questions (id, level, category, sentence_en)
VALUES (
  '103877dd-c173-4c4e-9f69-1c5aae5507f8', 
  'hard', 
  'Legal English', 
  'The evidence presented during the trial was [blank], leaving no room for doubt.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES
-- Correct Answers
(
  '103877dd-c173-4c4e-9f69-1c5aae5507f8', 'inconclusive', true, 
  '{
     "ar": "كانت نتائج الدراسة غير حاسمة...", 
     "cn": "研究结果尚无定论...", 
     "de": "Die Ergebnisse der Studie waren nicht schlüssig...", 
     "es": "Los hallazgos del estudio no fueron concluyentes...", 
     "fr": "Les conclusions de l''étude n''étaient pas concluantes...", 
     "jp": "研究の結果は決定力的ではなかったので…", 
     "pt": "Os resultados do estudo foram inconclusivos...", 
     "tr": "Araştırma bulguları sonuçsuz (inconclusive) olduğu için..."
   }'::jsonb, null
),
(
  '103877dd-c173-4c4e-9f69-1c5aae5507f8', 'ambiguous', true, 
  '{
     "ar": "كانت النتائج غامضة...", 
     "cn": "结果模糊不清...", 
     "de": "Die Ergebnisse waren mehrdeutig...", 
     "es": "Los hallazgos eran ambiguos...", 
     "fr": "Les résultats étaient ambigus...", 
     "jp": "結果が曖昧だったので…", 
     "pt": "Os resultados foram ambíguos...", 
     "tr": "Bulgular belirsiz (ambiguous) olduğu için..."
   }'::jsonb, null
),
(
  '103877dd-c173-4c4e-9f69-1c5aae5507f8', 'indeterminate', true, 
  '{
     "ar": "كانت النتائج غير محددة...", 
     "cn": "结果不确定...", 
     "de": "Die Ergebnisse waren unbestimmt...", 
     "es": "Los hallazgos eran indeterminados...", 
     "fr": "Les résultats étaient indéterminés...", 
     "jp": "結果が不確定だったので…", 
     "pt": "Os resultados foram indeterminados...", 
     "tr": "Bulgular saptanamaz/belirsiz (indeterminate) olduğu için..."
   }'::jsonb, null
),
-- Incorrect Answers
(
  '103877dd-c173-4c4e-9f69-1c5aae5507f8', 'finished', false, null,
  '{
    "ar": "تعني ''Finished'' منتهي ماديًا؛ بالنسبة للنتائج، الأصح هو ''inconclusive''.",
    "cn": "“Finished”指物理上的结束；对于结果，应使用“inconclusive”。",
    "de": "''Finished'' bedeutet beendet; für Forschungsergebnisse ist ''inconclusive'' präziser.",
    "es": "''Finished'' es para algo terminado físicamente; para resultados se usa ''inconclusive''.",
    "fr": "''Finished'' désigne une fin physique ; pour des résultats, on utilise ''inconclusive''.",
    "jp": "「Finished」は物理的な終了を意味します。結果には「inconclusive」が適切です。",
    "pt": "''Finished'' indica fim físico; para resultados, usa-se ''inconclusive''.",
    "tr": "''Finished'' fiziksel bir bitişi anlatır, akademik sonuçlar için ''inconclusive'' (sonuçsuz) daha doğrudur."
  }'::jsonb
),
(
  '103877dd-c173-4c4e-9f69-1c5aae5507f8', 'broken', false, null,
  '{
    "tr": "Bulgular bozulabilir ancak akademik dilde ''çalışmayan'' anlamında ''broken'' kullanılmaz."
  }'::jsonb
),
(
  '103877dd-c173-4c4e-9f69-1c5aae5507f8', 'closed', false, null,
  '{
    "tr": "Eğer bulgular ''kapalı'' (closed) olsaydı, takip araştırmasına (follow-up) gerek kalmazdı."
  }'::jsonb
),
(
  '103877dd-c173-4c4e-9f69-1c5aae5507f8', 'fast', false, null,
  '{
    "tr": "Hız bildirir. Bulguların niteliği için hızı değil, netliği (ambiguous) sorgulanır."
  }'::jsonb
);
