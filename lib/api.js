import { supabase } from './supabase';

/**
 * Service Layer for centralized Supabase calls.
 */

// --- USER PROFILE ---

export const fetchUserProfile = async (userId) => {
    if (!userId) throw new Error('User ID required');

    const { data, error } = await supabase
        .from('profiles')
        .select(`username, total_points, score_daily, streak_count, native_lang, app_lang, is_admin, is_premium, last_score_date`)
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
        .eq('level', level);

    if (error) throw error;
    return data;
};

export const fetchUserProgress = async (userId, level) => {
    const { data, error } = await supabase
        .from('user_progress')
        .select('question_id, mistake_count')
        .eq('user_id', userId)
        .eq('level', level);

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

export const saveProgress = async (userId, questionId, level, mistakes) => {
    const { error } = await supabase.from('user_progress').upsert({
        user_id: userId,
        question_id: questionId,
        level: level,
        mistake_count: mistakes,
        completed_at: new Date()
    }, { onConflict: 'user_id, question_id' });

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
