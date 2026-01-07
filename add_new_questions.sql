-- 1. Support more levels by removing the check constraint
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_level_check;

-- 2. Insert New Questions

-- QUESTION 1: A2 / Travel / Bus Trip
INSERT INTO public.questions (id, level, category, sentence_en)
VALUES ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'A2', 'Travel', 'We went on a bus [blank] around the city.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES
-- Correct: trip
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'trip', true, '{
  "tr": "Şehirde bir otobüs /ul/gezisine/ul/ çıktık.",
  "es": "Fuimos a un /ul/viaje/ul/ en autobús por la ciudad.",
  "fr": "Nous avons fait un /ul/voyage/ul/ en bus autour de la ville.",
  "pt": "Fizemos um /ul/passeio/ul/ de ônibus pela cidade.",
  "cn": "我们坐巴士在城市里/ul/转了一圈/ul/。",
  "jp": "私たちはバスで市内を/ul/旅行しました/ul/。",
  "kr": "우리는 버스를 타고 도시를 /ul/여행했습니다/ul/。",
  "ru": "Мы отправились в /ul/поездку/ul/ на автобусе по городу."
}'::jsonb, null),

-- Correct: tour
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'tour', true, '{
  "tr": "Şehirde bir otobüs /ul/turuna/ul/ çıktık.",
  "es": "Hicimos un /ul/tour/ul/ en autobús por la ciudad.",
  "fr": "Nous avons fait un /ul/tour/ul/ en bus autour de la ville.",
  "pt": "Fizemos um /ul/tour/ul/ de ônibus pela cidade.",
  "cn": "我们坐巴士在城市里/ul/观光/ul/。",
  "jp": "私たちはバスで市内/ul/観光をしました/ul/。",
  "kr": "우리는 버스를 타고 도시 /ul/투어를 했습니다/ul/。",
  "ru": "Мы отправились в /ul/автобусный тур/ul/ по городу."
}'::jsonb, null),

-- Incorrect: travel
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'travel', false, null, '{
  "en": "''Travel'' is usually an uncountable noun or a verb. You cannot say ''a travel''.",
  "tr": "''Travel'' genellikle sayılamayan bir isim veya fiildir. ''A travel'' diyemezsiniz.",
  "es": "''Travel'' suele ser un sustantivo incontable o un verbo. No se puede decir ''a travel''.",
  "fr": "''Travel'' est généralement un nom indénombrable ou un verbe. On ne peut pas dire ''a travel''.",
  "pt": "''Travel'' é geralmente um substantivo incontável ou um verbo. Não se pode dizer ''a travel''.",
  "cn": "“Travel”通常是不可数名词或动词。你不能说“a travel”。",
  "jp": "「Travel」は通常、不可算名詞または動詞です。「a travel」とは言えません。",
  "kr": "''Travel''은 보통 셀 수 없는 명사나 동사입니다. ''a travel''이라고 할 수 없습니다.",
  "ru": "''Travel'' обычно является неисчисляемым существительным или глаголом. Нельзя сказать ''a travel''."
}'::jsonb),

-- Incorrect: way
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'way', false, null, '{
  "en": "''Way'' refers to a direction or method, not a journey for pleasure.",
  "tr": "''Way'' bir yön veya yöntem anlamına gelir, keyif amaçlı bir yolculuk değildir.",
  "es": "''Way'' se refiere a una dirección o método, no a un viaje de placer.",
  "fr": "''Way'' fait référence à une direction ou une méthode, pas à un voyage d''agrément.",
  "pt": "''Way'' refere-se a uma direção ou método, não a uma viagem de lazer.",
  "cn": "“Way”指的是方向或方法，而不是消遣旅行。",
  "jp": "「Way」は方向や方法を指し、娯楽のための旅行ではありません。",
  "kr": "''Way''는 방향이나 방법을 의미하며, 즐거움을 위한 여행이 아닙니다.",
  "ru": "''Way'' относится к направлению или методу, а не к развлекательной поездке."
}'::jsonb);


-- QUESTION 2: C2 / Social Issues / Supporters Clashed
INSERT INTO public.questions (id, level, category, sentence_en)
VALUES ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'C2', 'Social Issues', 'The two groups of supporters [blank] outside the stadium.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES
-- Correct: clashed
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'clashed', true, '{
  "tr": "İki taraftar grubu stadyumun dışında /ul/çatıştı/ul/.",
  "es": "Los dos grupos de seguidores /ul/chocaron/ul/ fuera del estadio.",
  "fr": "Les deux groupes de supporters se sont /ul/affrontés/ul/ à l''extérieur du stade.",
  "pt": "Os dois grupos de torcedores /ul/entraram em confronto/ul/ fora do estádio.",
  "cn": "两组支持者在体育场外/ul/发生了冲突/ul/。",
  "jp": "サポーターの2つのグループがスタジアムの外で/ul/衝突しました/ul/。",
  "kr": "두 서포터 그룹이 경기장 밖에서 /ul/충돌했습니다/ul/。",
  "ru": "Dве группы болельщиков /ul/столкнулись/ul/ за пределами стадиона."
}'::jsonb, null),

-- Correct: fought
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'fought', true, '{
  "tr": "İki taraftar grubu stadyumun dışında /ul/kavga etti/ul/.",
  "es": "Los dos grupos de seguidores /ul/pelearon/ul/ fuera del estadio.",
  "fr": "Les deux groupes de supporters se sont /ul/battus/ul/ à l''extérieur du stade.",
  "pt": "Os dois grupos de torcedores /ul/brigaram/ul/ fora do estádio.",
  "cn": "两组支持者在体育场外/ul/打架/ul/。",
  "jp": "サポーターの2つのグループがスタジアムの外で/ul/戦いました/ul/（喧嘩しました）。",
  "kr": "두 서포터 그룹이 경기장 밖에서 /ul/싸웠습니다/ul/。",
  "ru": "Dве группы болельщиков /ul/дрались/ul/ за пределами стадиона."
}'::jsonb, null),

-- Incorrect: crashed
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'crashed', false, null, '{
  "en": "''Crash'' is used for vehicles or loud noises, not typically for people fighting. (Semantic Nuance)",
  "tr": "''Crash'' (kaza yapmak/çarpmak) araçlar veya yüksek sesler için kullanılır, kavga eden insanlar için değil.",
  "es": "''Crash'' (chocar/estrellarse) se usa para vehículos o ruidos fuertes, no para peleas de personas.",
  "fr": "''Crash'' s''utilise pour des véhicules ou des bruits forts, pas pour des gens qui se battent.",
  "pt": "''Crash'' (bater/colidir) é usado para veículos ou barulhos altos, não para pessoas brigando.",
  "cn": "“Crash”通常用于车辆撞击或巨响，而不是指人打架。",
  "jp": "「Crash」は通常、車両の衝突や大きな音に使われ、人々の喧嘩には使われません。",
  "kr": "''Crash''는 차량や 큰 소음에 사용되며, 보통 사람들의 싸움에는 쓰이지 않습니다.",
  "ru": "''Crash'' используется для транспортных средств или громких звуков, а не для драк."
}'::jsonb),

-- Incorrect: dashed
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'dashed', false, null, '{
  "en": "''Dash'' means to run or move quickly, not to fight. (Semantic Nuance)",
  "tr": "''Dash'' (fırlamak/koşmak) hızlıca hareket etmek anlamına gelir, kavga etmek değil.",
  "es": "''Dash'' significa correr o moverse rápidamente, no pelear.",
  "fr": "''Dash'' signifie se précipiter ou bouger vite, pas se battre.",
  "pt": "''Dash'' significa correr ou mover-se rapidamente, não brigar.",
  "cn": "“Dash”意思是猛冲或快跑，而不是打架。",
  "jp": "「Dash」は急いで走る、または動くという意味で、戦うという意味ではありません。",
  "kr": "''Dash''는 돌진하다 혹은 빠르게 움직인다는 뜻이지, 싸운다는 뜻이 아닙니다。",
  "ru": "''Dash'' означает мчаться или быстро двигаться, а не драться."
}'::jsonb);


-- QUESTION 3: C2 / Law/Communication / She maintained...
INSERT INTO public.questions (id, level, category, sentence_en)
VALUES ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'C2', 'Law/Communication', 'She [blank] that she was innocent throughout the trial.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.words (question_id, word_text, is_correct, translations, explanations)
VALUES
-- Correct: maintained
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'maintained', true, '{
  "tr": "Duruşma boyunca masum olduğunu /ul/savundu/ul/ (iddia etti).",
  "es": "Ella /ul/sostuvo/ul/ que era inocente durante todo el juicio.",
  "fr": "Elle a /ul/maintenu/ul/ qu''elle était innocente tout au long du procès.",
  "pt": "Ela /ul/manteve/ul/ que era inocente durante todo o julgamento.",
  "cn": "她在整个审判过程中/ul/坚称/ul/自己是无辜的。",
  "jp": "彼女は裁判の間中、自分が無実であることを/ul/主張し続けました/ul/。",
  "kr": "그녀는 재판 내내 자신이 무죄라고 /ul/주장했습니다/ul/。",
  "ru": "Она /ul/утверждала/ul/, что невиновна, на протяжении всего судебного процесса."
}'::jsonb, null),

-- Correct: insisted
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'insisted', true, '{
  "tr": "Duruşma boyunca masum olduğu konusunda /ul/ısrar etti/ul/.",
  "es": "Ella /ul/insistió/ul/ en que era inocente durante todo el juicio.",
  "fr": "Elle a /ul/insisté/ul/ sur le fait qu''elle était innocente tout au long du procès.",
  "pt": "Ela /ul/insistiu/ul/ que era inocente durante todo o julgamento.",
  "cn": "她在整个审判过程中/ul/坚持/ul/自己是无辜的。",
  "jp": "彼女は裁判の間中、自分が無実であると/ul/言い張りました/ul/。",
  "kr": "그녀는 재판 내내 자신이 무죄라고 /ul/우겼습니다/ul/。",
  "ru": "Она /ul/настаивала/ul/ на том, что невиновна, на протяжении всего судебного процесса."
}'::jsonb, null),

-- Incorrect: told
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'told', false, null, '{
  "en": "''Told'' is transitive; it needs an object (e.g., told *us* that). (Transitivity Failure)",
  "tr": "''Told'' (söyledi) geçişli bir fiildir; bir nesneye ihtiyaç duyar (örneğin: *bize* söyledi).",
  "es": "''Told'' es transitivo; necesita un objeto (ej. told *us* - nos dijo).",
  "fr": "''Told'' est transitif; il a besoin d''un objet (ex: told *us*).",
  "pt": "''Told'' é transitivo; precisa de um objeto (ex: told *us* - nos disse).",
  "cn": "“Told”是及物动词；它需要一个宾语（例如，told *us* that）。",
  "jp": "「Told」は他動詞です。目的語が必要です（例：told *us* that）。",
  "kr": "''Told''는 타동사입니다. 목적어가 필요합니다 (예: told *us* that - 우리에게 말했다).",
  "ru": "''Told'' — переходный глагол; ему нужен объект (например, told *us* that)."
}'::jsonb),

-- Incorrect: persuaded
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'persuaded', false, null, '{
  "en": "''Persuaded'' requires an object (persuaded *someone*). You don''t ''persuade that''. (Transitivity Failure)",
  "tr": "''Persuaded'' (ikna etti) bir nesne gerektirir (*birini* ikna etti). ''Persuade that'' denmez.",
  "es": "''Persuaded'' requiere un objeto (persuaded *someone*). No se dice ''persuade that''.",
  "fr": "''Persuaded'' nécessite un objet (persuaded *someone*). On ne dit pas ''persuade that''.",
  "pt": "''Persuaded'' requer um objeto (persuaded *someone*). Não se diz ''persuade that''.",
  "cn": "“Persuaded”需要宾语（persuaded *someone*）。你不能说“persuade that”。",
  "jp": "「Persuaded」には目的語が必要です（誰かを説得する）。「persuade that」とは言いません。",
  "kr": "''Persuaded''는 목적어가 필요합니다 (*누군가를* 설득하다). ''Persuade that''이라고 하지 않습니다.",
  "ru": "''Persuaded'' требует объекта (убедил *кого-то*). Нельзя сказать ''persuade that''."
}'::jsonb);
