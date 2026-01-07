INSERT INTO daily_words (date, level, word, definition_en, definition_tr) VALUES (CURRENT_DATE, 'A1', 'TESTWORD', 'A word for testing', 'Test için bir kelime') ON CONFLICT (date, level) DO NOTHING;
