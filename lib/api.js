import { supabase } from './supabase';

/**
 * Service Layer for centralized Supabase calls.
 */

// --- USER PROFILE ---

export const fetchUserProfile = async (userId) => {
    if (!userId) throw new Error('User ID required');

    const { data, error } = await supabase
        .from('profiles')
        .select(`username, total_points, score_daily, streak_count, native_lang, app_lang, is_admin, is_premium, last_score_date, current_level`)
        .eq('id', userId)
        .single();

    if (error) throw error;

    // Client-side aesthetic reset: If last score was yesterday, show 0 today.
    if (data && data.last_score_date) {
        const last = new Date(data.last_score_date);
        const now = new Date();
        if (last.toDateString() !== now.toDateString()) {
            data.score_daily = 0;
        }
    }

    return data;
};

export const updateDailyGoal = async (userId, newGoal) => {
    const { error } = await supabase
        .from('profiles')
        .update({ daily_goal: newGoal })
        .eq('id', userId);

    if (error) throw error;
};

// --- GAME LOGIC ---

export const fetchQuestionsForLevel = async (level) => {
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .ilike('level', level);

    if (error) throw error;
    return data;
};

export const fetchUserProgress = async (userId, level) => {
    const { data, error } = await supabase
        .from('user_progress')
        .select('question_id, mistake_count')
        .eq('user_id', userId)
        .ilike('level', level);

    if (error) throw error;
    return data;
};

export const fetchLevelCounts = async (userId, level) => {
    // 1. Total Questions in Level
    const { count, error: qError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .ilike('level', level);

    if (qError) throw qError;

    // 2. User Progress
    const progress = await fetchUserLevelProgress(userId, level);

    // Calculate
    const seenCount = (progress.seen_ids || []).length;
    const favoriteCount = (progress.favorite_ids || []).length;

    // Mistakes: Count of unique questions (keys), not sum of errors
    const mistakeCount = Object.keys(progress.mistakes || {}).length;

    // New Questions = Total - Seen
    // Ensure not negative (in case of deletion/sync issues)
    const newCount = Math.max(0, (count || 0) - seenCount);

    return {
        newCount,
        mistakeCount,
        favoriteCount,
        totalCount: count,
        seenCount
    };
};

export const fetchSavedQuestions = async (userId) => {
    const { data, error } = await supabase
        .from('saved_questions')
        .select('question_id')
        .eq('user_id', userId);

    if (error) throw error;
    return data.map(i => i.question_id);
};

export const updateUserPointTransaction = async (userId, delta) => {
    // Calling the Smart RPC
    const { error } = await supabase.rpc('update_points', { user_id: userId, delta });
    if (error) throw error;
};

export const updateUserStreak = async (userId) => {
    const { error } = await supabase.rpc('update_streak', { p_user_id: userId });
    if (error) throw error;
};

// --- HYBRID PROGRESS (Arrays/JSON) ---

export const fetchUserLevelProgress = async (userId, level) => {
    const { data, error } = await supabase
        .from('user_level_progress')
        .select('*')
        .eq('user_id', userId)
        .ilike('level', level)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data || { seen_ids: [], favorite_ids: [], mistakes: {} };
};

export const markQuestionSeen = async (userId, level, questionId) => {
    // Resolve Level Casing
    const { data } = await supabase
        .from('user_level_progress')
        .select('level')
        .eq('user_id', userId)
        .ilike('level', level)
        .maybeSingle();

    const targetLevel = data?.level || level.toUpperCase();

    const { error } = await supabase.rpc('mark_question_seen', {
        p_user_id: userId,
        p_level: targetLevel,
        p_question_id: questionId
    });
    if (error) throw error;
};

export const toggleQuestionFavorite = async (userId, level, questionId) => {
    // Resolve Level Casing
    const { data } = await supabase
        .from('user_level_progress')
        .select('level')
        .eq('user_id', userId)
        .ilike('level', level)
        .maybeSingle();

    const targetLevel = data?.level || level.toUpperCase();

    const { data: resData, error } = await supabase.rpc('toggle_question_favorite', {
        p_user_id: userId,
        p_level: targetLevel,
        p_question_id: questionId
    });
    if (error) throw error;
    return resData; // returns true (favorited) or false (unfavorited)
};

export const recordQuestionMistake = async (userId, level, questionId) => {
    // Resolve Level Casing
    const { data } = await supabase
        .from('user_level_progress')
        .select('level')
        .eq('user_id', userId)
        .ilike('level', level)
        .maybeSingle();

    const targetLevel = data?.level || level.toUpperCase();

    const { error } = await supabase.rpc('record_question_mistake', {
        p_user_id: userId,
        p_level: targetLevel,
        p_question_id: questionId
    });
    if (error) throw error;
};

export const resolveQuestionMistake = async (userId, level, questionId) => {
    // Resolve Level Casing
    const { data } = await supabase
        .from('user_level_progress')
        .select('level')
        .eq('user_id', userId)
        .ilike('level', level)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

    const targetLevel = data?.level || level.toUpperCase();

    const { error } = await supabase.rpc('resolve_question_mistake', {
        p_user_id: userId,
        p_level: targetLevel,
        p_question_id: questionId
    });
    if (error) throw error;
};

export const markQuestionCompleted = async (userId, level, questionId, isPerfect) => {
    // Resolve Level Casing
    const { data } = await supabase
        .from('user_level_progress')
        .select('level')
        .eq('user_id', userId)
        .ilike('level', level)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

    const targetLevel = data?.level || level.toUpperCase();

    const { error } = await supabase.rpc('mark_question_completed', {
        p_user_id: userId,
        p_level: targetLevel,
        p_question_id: questionId,
        p_is_perfect: isPerfect
    });
    if (error) throw error;
};

export const recordAnswerStats = async (questionId, wordText, isCorrect, incrementAsked = true) => {
    // Fire and forget (don't block UI)
    supabase.rpc('record_answer_stats', {
        p_question_id: questionId,
        p_word_text: wordText,
        p_is_correct: isCorrect,
        p_increment_asked: incrementAsked
    }).then(({ error }) => {
        if (error) console.error("Error recording stats:", error);
    });
};

export const resetSeenQuestions = async (userId, level, includeMistakes, includeFavorites) => {
    // 1. Get current progress
    const { data, error } = await supabase
        .from('user_level_progress')
        .select('*')
        .eq('user_id', userId)
        .ilike('level', level)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) return 0; // Nothing to reset

    // IDs explicitly tracked
    const correctIds = new Set((data.correct_ids || []).map(String));
    const mistakeIds = new Set(Object.keys(data.mistakes || {}));
    const favoriteIds = new Set((data.favorite_ids || []).map(String));

    let idsToReset = new Set();

    // User Requirement: "when user starts a new deck without choosing checkboxes, add only correct questions"
    // So START with correct_ids
    correctIds.forEach(id => idsToReset.add(id));

    if (includeMistakes) {
        mistakeIds.forEach(id => idsToReset.add(id));
    }

    if (includeFavorites) {
        favoriteIds.forEach(id => idsToReset.add(id));
    }

    // New Seen Set = Old Seen - idsToReset
    // (Also remove form correct_ids if reset)
    const newSeenList = (data.seen_ids || []).filter(id => !idsToReset.has(String(id)));

    // New Correct List
    const newCorrectList = (data.correct_ids || []).filter(id => !idsToReset.has(String(id)));

    // New Mistakes List (remove cleared mistakes)
    let newMistakes = { ...data.mistakes };
    idsToReset.forEach(id => {
        if (newMistakes[id]) {
            delete newMistakes[id];
        }
    });

    // Calculate how many were "freed" (removed from seen)
    const freedCount = (data.seen_ids || []).length - newSeenList.length;

    // 3. Update DB
    const targetLevel = data.level;

    const { error: uError } = await supabase
        .from('user_level_progress')
        .update({
            seen_ids: newSeenList,
            correct_ids: newCorrectList,
            mistakes: newMistakes
        })
        .eq('user_id', userId)
        .eq('level', targetLevel);

    if (uError) throw uError;

    return freedCount;
};



// --- LEADERBOARD & STATS ---

export const fetchLeaderboard = async (timeframe) => {
    const column = `score_${timeframe}`;
    const { data, error } = await supabase
        .from('profiles')
        .select(`id, username, ${column}, streak_count`)
        .order(column, { ascending: false })
        .limit(10);

    if (error) throw error;
    return data;
};

export const fetchMyStats = async (userId, timeframe) => {
    const column = `score_${timeframe}`;
    const { data, error } = await supabase
        .from('profiles')
        .select(`username, ${column}, streak_count`)
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
};

// --- META DATA & LEVEL ---

export const fetchCategories = async () => {
    // Client-side distinct until RPC
    const { data, error } = await supabase.from('questions').select('category');
    if (error) throw error;
    return [...new Set(data.map(q => q.category).filter(Boolean))];
};

export const updateUserLevel = async (userId, newLevel) => {
    const { error } = await supabase.from('profiles').update({ current_level: newLevel.toUpperCase() }).eq('id', userId);
    if (error) throw error;
};

export const resetUserPoints = async (userId) => {
    // Reset total points and daily points. Maybe not streak? User said "points".
    const { error } = await supabase.from('profiles').update({ total_points: 0, score_daily: 0 }).eq('id', userId);
    if (error) throw error;
};

export const resetLevelProgress = async (userId, level) => {
    // Delete progress rows for this user and level
    const { error } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', userId)
        .eq('level', level.toUpperCase());

    if (error) throw error;
};

export const updateUserLanguage = async (userId, langCode) => {
    // Unify app_lang and native_lang
    const { error } = await supabase
        .from('profiles')
        .update({ app_lang: langCode, native_lang: langCode })
        .eq('id', userId);

    if (error) throw error;
};

// --- DAILY WORD OF THE DAY ---

export const fetchDailyWord = async (level) => {
    // 1. Try to get specific word for today and level
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('daily_words')
        .select('*')
        .eq('date', today)
        .ilike('level', level)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') { // 116 = no rows found
        console.error("Error fetching daily word:", error);
    }

    if (data) return data;

    // 2. FALLBACK: If no word assigned for today, pick a RANDOM word from questions
    // This ensures the feature always works even if admin forgets to add words.
    // We use a hash of the date to ensure it's the SAME random word for everyone on that day.
    console.log("No specific daily word found, using fallback.");

    // For now, simpler fallback: just random from questions
    const { data: fallbackData, error: fbError } = await supabase
        .from('questions')
        .select('id, words')
        .ilike('level', level)
        .limit(1);

    if (fbError) {
        console.error("Fallback fetch error:", fbError);
    }

    if (fallbackData && fallbackData.length > 0) {
        const fallbackItem = fallbackData[0];
        // Construct a fake "daily word" object from a question
        // We need to extract the "correct" word
        let words = fallbackItem.words || fallbackItem.word_pool;
        if (typeof words === 'string') words = JSON.parse(words);

        const correctWord = words.find(w => w.is_correct);
        if (correctWord) {
            return {
                id: 'fallback-' + fallbackItem.id,
                word: correctWord.word_text || correctWord.word,
                definition_en: correctWord.explanations?.en || "No definition available",
                definition_tr: correctWord.explanations?.tr,
                // Add other langs if needed
            };
        }
    }

    return null;
};

export const checkDailyBonusStatus = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('last_wotd_date')
        .eq('id', userId)
        .single();

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    return data?.last_wotd_date === today; // true if already claimed
};

export const claimDailyBonus = async (userId) => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Update Profile (mark as claimed)
    const { error: pError } = await supabase
        .from('profiles')
        .update({ last_wotd_date: today })
        .eq('id', userId);

    if (pError) throw pError;

    // 2. Add Points (+50)
    await supabase.rpc('update_points', { user_id: userId, delta: 50 });
};

// --- ADMIN: WOTD ---

// --- USER STATS ---

export const fetchUserStats = async (userId) => {
    const { data, error } = await supabase.rpc('get_user_stats', { p_user_id: userId });
    if (error) throw error;
    return data || { questions_seen: 0, words_seen: 0 };
};

export const fetchAdminDailyWords = async () => {
    // Fetch all words, ordered by date descending
    const { data, error } = await supabase
        .from('daily_words')
        .select('*')
        .order('date', { ascending: false });

    if (error) throw error;
    return data;
};

export const createDailyWord = async (wordData) => {
    const { error } = await supabase
        .from('daily_words')
        .insert([wordData]);

    if (error) {
        console.error("createDailyWord Error:", error);
        throw error;
    }
};

export const updateDailyWord = async (id, wordData) => {
    const { error } = await supabase
        .from('daily_words')
        .update(wordData)
        .eq('id', id);

    if (error) {
        console.error("updateDailyWord Error:", error);
        throw error;
    }
};

export const deleteDailyWord = async (id) => {
    const { error } = await supabase
        .from('daily_words')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- CHALLENGE FUNCTIONS REMOVED ---
