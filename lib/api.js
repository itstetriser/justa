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
        .eq('level', level.toUpperCase());

    if (error) throw error;
    return data;
};

export const fetchUserProgress = async (userId, level) => {
    const { data, error } = await supabase
        .from('user_progress')
        .select('question_id, mistake_count')
        .eq('user_id', userId)
        .eq('level', level.toUpperCase());

    if (error) throw error;
    return data;
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
        .eq('level', level.toUpperCase())
        .maybeSingle();

    if (error) throw error;
    return data || { seen_ids: [], favorite_ids: [], mistakes: {} };
};

export const markQuestionSeen = async (userId, level, questionId) => {
    const { error } = await supabase.rpc('mark_question_seen', {
        p_user_id: userId,
        p_level: level.toUpperCase(),
        p_question_id: questionId
    });
    if (error) throw error;
};

export const toggleQuestionFavorite = async (userId, level, questionId) => {
    const { data, error } = await supabase.rpc('toggle_question_favorite', {
        p_user_id: userId,
        p_level: level.toUpperCase(),
        p_question_id: questionId
    });
    if (error) throw error;
    return data; // returns true (favorited) or false (unfavorited)
};

export const recordQuestionMistake = async (userId, level, questionId) => {
    const { error } = await supabase.rpc('record_question_mistake', {
        p_user_id: userId,
        p_level: level.toUpperCase(),
        p_question_id: questionId
    });
    if (error) throw error;
};

export const resolveQuestionMistake = async (userId, level, questionId) => {
    const { error } = await supabase.rpc('resolve_question_mistake', {
        p_user_id: userId,
        p_level: level.toUpperCase(),
        p_question_id: questionId
    });
    if (error) throw error;
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
        .eq('level', level.toUpperCase())
        .single();

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
        .select('id, words, word_pool')
        .eq('level', level.toUpperCase())
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
