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

-- Example 3: Hard (Your New Complex Example with Multi-language)
INSERT INTO public.questions (id, level, category, sentence_en)
VALUES ('eafcb9b9-5333-42ad-b857-f14e359c2a8a', 'hard', 'Academic Writing', 'The initial hypothesis was [blank] by the empirical data, forcing the researchers to reconsider their fundamental assumptions.');

INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES
-- Correct Answers
('eafcb9b9-5333-42ad-b857-f14e359c2a8a', 'invalidated', true, '{
  "ar": "تم إبطال الفرضية الأولية من خلال البيانات التجريبية، مما أجبر الباحثين على إعادة النظر في افتراضاتهم الأساسية.",
  "cn": "最初的假设被实验数据否定了，迫使研究人员重新考虑他们的基本假设。",
  "de": "Die ursprüngliche Hypothese wurde durch die empirischen Daten entkräftet, was die Forscher zwang, ihre grundlegenden Annahmen zu überdenken.",
  "es": "La hipótesis inicial fue invalidada por los datos empíricos, lo que obligó a los investigadores a reconsiderar sus supuestos fundamentales.",
  "fr": "L''hypothèse initiale a été invalidée par les données empiriques, obligeant les chercheurs à reconsidérer leurs hypothèses fondamentales.",
  "jp": "初期の仮説は実証データによって無効化され、研究者は基本的な仮定を再考せざるを得なくなりました。",
  "pt": "A hipótese inicial foi invalidada pelos dados empíricos, forçando os pesquisadores a reconsiderarem suas suposições fundamentais.",
  "tr": "İlk hipotez ampirik verilerle geçersiz kılındı ve bu durum araştırmacıları temel varsayımlarını yeniden gözden geçirmeye zorladı."
}'::jsonb, null),

('eafcb9b9-5333-42ad-b857-f14e359c2a8a', 'negated', true, '{
  "ar": "تم نفي الفرضية الأولية من خلال البيانات التجريبية، مما أجبر الباحثين على إعادة النظر في افتراضاتهم الأساسية.",
  "cn": "最初的假设被实验数据抵消了，迫使研究人员重新考虑他们的基本假设。",
  "de": "Die ursprüngliche Hypothese wurde durch die empirischen Daten negiert, was die Forscher zwang, ihre grundlegenden Annahmen zu überdenken.",
  "es": "La hipótesis inicial fue negada por los datos empíricos, lo que obligó a los investigadores a reconsiderar sus supuestos fundamentales.",
  "fr": "L''hypothèse initiale a été réfutée par les données empiriques, obligeant les chercheurs à reconsidérer leurs hypothèses fondamentales.",
  "jp": "初期の仮説は実証データによって否定され、研究者は基本的な仮定を再考せざるを得なくなりました。",
  "pt": "A hipótese inicial foi negada pelos dados empíricos, forçando os pesquisadores a reconsiderarem suas suposições fundamentais.",
  "tr": "İlk hipotez ampirik verilerle çürütüldü ve bu durum araştırmacıları temel varsayımlarını yeniden gözden geçirmeye zorladı."
}'::jsonb, null),

('eafcb9b9-5333-42ad-b857-f14e359c2a8a', 'rebutted', true, '{
  "ar": "تم دحض الفرضية الأولية من خلال البيانات التجريبية، مما أجبر الباحثين على إعادة النظر في افتراضاتهم الأساسية.",
  "cn": "最初的假设被实验数据驳斥了，迫使研究人员重新考虑他们的基本假设。",
  "de": "Die ursprüngliche Hypothese wurde durch die empirischen Daten widerlegt, was die Forscher zwang, ihre grundlegenden Annahmen zu überdenken.",
  "es": "La hipótesis inicial fue refutada por los datos empíricos, lo que obligó a los investigadores a reconsiderar sus supuestos fundamentales.",
  "fr": "L''hypothèse initiale a été repoussée par les données empiriques, obligeant les chercheurs à reconsidérer leurs hypothèses fondamentales.",
  "jp": "初期の仮説は実証データによって反論され、研究者は基本的な仮定を再考せざるを得なくなりました。",
  "pt": "A hipótese inicial foi rebatida pelos dados empíricos, forçando os pesquisadores a reconsiderarem suas suposições fundamentais.",
  "tr": "İlk hipotez ampirik verilerle reddedildi ve bu durum araştırmacıları temel varsayımlarını yeniden gözden geçirmeye zorladı."
}'::jsonb, null),

-- Incorrect Answers
('eafcb9b9-5333-42ad-b857-f14e359c2a8a', 'substantiated', false, null, '{
  "ar": "تعني إثبات؛ لو تم إثبات الفرضية، لما اضطر الباحثون لإعادة النظر في افتراضاتهم.",
  "cn": "意为证实；如果假设被证实了，研究人员就无需重新考虑假设。",
  "de": "Bedeutet untermauern; wäre sie untermauert worden, hätten sie nichts überdenken müssen.",
  "es": "Significa corroborar; si se hubiera corroborado, no tendrían que reconsiderar nada.",
  "fr": "Signifie étayer ; si elle avait été étayée, ils n''auraient pas eu à reconsidérer quoi que ce soit.",
  "jp": "実証することを意味します。もし実証されていれば、仮定を再考する必要はありません。",
  "pt": "Significa fundamentar; se tivesse sido fundamentada, não precisariam reconsiderar.",
  "tr": "Kanıtlamak demektir; hipotez kanıtlansaydı araştırmacılar varsayımlarını değiştirmek zorunda kalmazdı."
}'::jsonb),

('eafcb9b9-5333-42ad-b857-f14e359c2a8a', 'corroborated', false, null, '{
  "ar": "تعني تأكيد؛ وهذا يتناقض مع حقيقة اضطرارهم لتغيير افتراضاتهم.",
  "cn": "意为证实；这与研究人员必须改变假设的事实相矛盾。",
  "de": "Bedeutet bekräftigen; dies widerspricht der Tatsache, dass sie ihre Annahmen ändern mussten.",
  "es": "Significa confirmar; esto contradice el hecho de que tuvieran que cambiar sus supuestos.",
  "fr": "Signifie corroborer ; cela contredit le fait qu''ils aient dû changer leurs hypothèses.",
  "jp": "裏付けることを意味しますが、これは研究者が仮定を変更したことと矛盾します。",
  "pt": "Significa corroborar; isso contradiz o fato de terem que mudar suas suposições.",
  "tr": "Doğrulamak anlamına gelir; bu durum araştırmacıların varsayımlarını değiştirmesiyle çelişir."
}'::jsonb),

('eafcb9b9-5333-42ad-b857-f14e359c2a8a', 'bolstered', false, null, '{
  "ar": "تعني تعزيز؛ لو عززت البيانات الفرضية، لما كانت هناك حاجة لنهج جديد.",
  "cn": "意为加强；如果数据加强了假设，就不需要新的方法了。",
  "de": "Bedeutet stärken; hätten die Daten die Hypothese gestärkt, wäre kein neuer Ansatz nötig gewesen.",
  "es": "Significa reforzar; si los datos reforzaran la hipótesis, no haría falta un nuevo enfoque.",
  "fr": "Signifie renforcer ; si les données renforçaient l''hypothèse, il n''y aurait pas besoin d''une nouvelle approche.",
  "jp": "強化することを意味します。データが仮説を強化していれば、新しいアプローチは必要ありません。",
  "pt": "Significa reforçar; se os dados reforçassem a hipótese, não haveria necessidade de uma nova abordagem.",
  "tr": "Güçlendirmek demektir; veriler hipotezi güçlendirseydi yeni bir yaklaşıma gerek kalmazdı."
}'::jsonb),

('eafcb9b9-5333-42ad-b857-f14e359c2a8a', 'advocated', false, null, '{
  "ar": "تعني الدفاع عن؛ البيانات لا تدافع عن رأي، بل تدعمه أو تدحضه.",
  "cn": "意为倡导；数据不倡导观点，而是支持或反驳观点。",
  "de": "Bedeutet befürworten; Daten befürworten nicht, sondern stützen oder widerlegen.",
  "es": "Significa abogar por; los datos no abogan, sino que apoyan o refutan.",
  "fr": "Signifie préconiser ; les données ne préconisent pas, elles soutiennent ou réfutent.",
  "jp": "提唱することを意味します。データは意見を提唱するのではなく、裏付けたり反論したりするものです。",
  "pt": "Significa advogar; os dados não advogam, apenas apoiam ou refutam.",
  "tr": "Savunmak demektir; veriler bir görüşü savunmaz, ancak onu destekleyebilir veya çürütebilir."
}'::jsonb);

-- Verify Admin Column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
