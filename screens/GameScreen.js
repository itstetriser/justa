import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Vibration, LayoutAnimation, Platform, UIManager, Alert, ScrollView, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getTranslation } from '../lib/translations';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function GameScreen({ route, navigation }) {
    const { level, userLang = 'tr', appLang = 'en', isPremium = false } = route.params;

    // Game State
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gameMode, setGameMode] = useState('NEW'); // NEW | REVIEW | PRACTICE

    // Play Statistics
    const [sessionMistakes, setSessionMistakes] = useState(0);
    const [reviewCount, setReviewCount] = useState(0); // How many errors pending?

    // Current Question State
    const [selectedWords, setSelectedWords] = useState([]);
    const [isCorrect, setIsCorrect] = useState(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalCorrectNeeded, setTotalCorrectNeeded] = useState(0);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [levelComplete, setLevelComplete] = useState(false);

    const [sessionScore, setSessionScore] = useState(0);

    // Helper for translations (UI Language)
    const t = (key) => getTranslation(appLang, key);

    useFocusEffect(
        useCallback(() => {
            fetchQuestion();
            setSessionScore(0); // Reset score on new session/focus? Or just once?
            // If "each run is different", resetting on mount is fine.
            return () => { };
        }, [gameMode]) // Re-fetch on mode switch
    );

    const fetchQuestion = async () => {
        try {
            setLoading(true);
            setIsCorrect(null);
            setSelectedWords([]);
            setSessionMistakes(0);
            setLevelComplete(false);

            const { data: { user } } = await supabase.auth.getUser();

            // 1. Fetch ALL Questions for Level
            const { data: allQuestions, error: qError } = await supabase
                .from('questions')
                .select('*')
                .eq('level', level);

            if (qError || !allQuestions?.length) {
                Alert.alert('Error', 'No questions found.');
                navigation.goBack();
                return;
            }

            // 2. Fetch User Progress
            const { data: progress, error: pError } = await supabase
                .from('user_progress')
                .select('question_id, mistake_count')
                .eq('user_id', user.id)
                .eq('level', level);

            // 3. Determine Pool based on Game Mode
            let pool = [];

            // Map progress for O(1) lookups
            const progressMap = new Map();
            progress?.forEach(p => progressMap.set(p.question_id, p));

            // Calc Stats for UI
            const pendingReviews = progress?.filter(p => p.mistake_count > 0).length || 0;
            setReviewCount(pendingReviews);

            if (gameMode === 'NEW') {
                // Only questions NOT in progress
                pool = allQuestions.filter(q => !progressMap.has(q.id));
            } else if (gameMode === 'REVIEW') {
                // Only questions WITH mistakes
                pool = allQuestions.filter(q => {
                    const p = progressMap.get(q.id);
                    return p && p.mistake_count > 0;
                });
            } else {
                // PRACTICE: Everything
                pool = allQuestions;
            }

            // 4. Handle Empty Pool (Level Complete)
            if (pool.length === 0) {
                if (gameMode === 'NEW') {
                    // Finished all new content -> Show Level Complete
                    setLevelComplete(true);
                } else if (gameMode === 'REVIEW') {
                    // Cleared all reviews -> Go back to Menu or Suggest Practice
                    Alert.alert(t('greatJob'), "You've fixed all your mistakes!");
                    setGameMode('NEW'); // Will trigger re-fetch and show complete screen if mostly done
                }
                setLoading(false);
                return;
            }

            // 5. Select Random Question
            const randomIndex = Math.floor(Math.random() * pool.length);
            const q = pool[randomIndex];

            // Parse & Prepare Words (Standard Logic)
            let parsedWords = [];
            const rawWords = q.words || q.word_pool;
            if (rawWords) {
                parsedWords = typeof rawWords === 'string' ? JSON.parse(rawWords) : rawWords;
            }
            parsedWords = parsedWords.map((w, index) => ({
                ...w,
                id: w.id || w.word_id || `temp-${index}-${Date.now()}`,
                word_text: w.word_text || w.word
            }));

            const needed = parsedWords.filter(w => w.is_correct).length;
            parsedWords.sort(() => Math.random() - 0.5);

            setQuestion({ ...q, words: parsedWords });
            setTotalCorrectNeeded(needed);
            setCorrectCount(0);

        } catch (error) {
            console.error('Error fetching question:', error);
            Alert.alert('Error', 'Failed to load question');
        } finally {
            setLoading(false);
        }
    };

    const handleWordSelect = async (wordObj) => {
        if (!question) return;

        const isAlreadyFound = selectedWords.some(w => w.id === wordObj.id);
        if (isAlreadyFound) return;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        // Add to selected list regardless of correctness (removes from pool)
        const newFound = [...selectedWords, wordObj];
        setSelectedWords(newFound);

        const { data: { user } } = await supabase.auth.getUser();

        if (wordObj.is_correct) {
            // Correct: Light Haptic Tick
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const currentCorrectCount = newFound.filter(w => w.is_correct).length;
            setCorrectCount(currentCorrectCount);

            // +10 Points
            setSessionScore(prev => prev + 10); // Local Session Update
            if (user) {
                // Background DB Sync
                await supabase.rpc('update_points', { user_id: user.id, delta: 10 });
                // Update Streak (RPC handles daily logic)
                await supabase.rpc('update_streak', { p_user_id: user.id });
            }

            if (currentCorrectCount >= totalCorrectNeeded) {
                setIsCorrect(true);

                // --- UPSERT PROGRESS ---
                if (user && question) {
                    await supabase.from('user_progress').upsert({
                        user_id: user.id,
                        question_id: question.id,
                        level: level,
                        mistake_count: sessionMistakes,
                        completed_at: new Date()
                    }, { onConflict: 'user_id, question_id' });
                }
            }
        } else {
            // Incorrect: Short Vibration
            Vibration.vibrate(50); // Distinct buzz
            setSessionMistakes(prev => prev + 1);

            // -3 Points (ONLY if IsCorrect is NOT true yet)
            // User said: "If he found all correct answers, then even if he clicks an incorrect answer, he doesnt lose any points."
            // But wait, if he found all correct answers, the game "ends" usually?
            // Ah, he can still click remaining incorrect words to see explanations.
            if (!isCorrect && user) {
                setSessionScore(prev => prev - 3);
                await supabase.rpc('update_points', { user_id: user.id, delta: -3 });
            }

            // Robust Explanation Lookup (for logging/debugging if needed)
            let explanation = 'Incorrect choice.';
            if (wordObj.explanations && Object.keys(wordObj.explanations).length > 0) {
                explanation = wordObj.explanations[userLang] || Object.values(wordObj.explanations)[0];
            } else if (wordObj.translations && Object.keys(wordObj.translations).length > 0) {
                explanation = wordObj.translations[userLang] || Object.values(wordObj.translations)[0];
            }
            console.log("Incorrect:", explanation);
        }
    };

    const nextQuestion = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        fetchQuestion();
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // LEVEL COMPLETE SCREEN
    if (levelComplete) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, styles.center]}>
                <View style={[styles.card, { paddingVertical: 40, width: '100%' }]}>
                    <Text style={{ fontSize: 60, marginBottom: 20 }}>🎉</Text>
                    <Text style={styles.sentenceText}>Level Complete!</Text>
                    <Text style={[styles.modalDesc, { marginTop: 10 }]}>
                        You've answered all questions in this level.
                    </Text>

                    <View style={{ width: '100%', gap: 15, marginTop: 30 }}>

                        {/* Option 1: Review Mistakes (if any) */}
                        {reviewCount > 0 && (
                            <TouchableOpacity
                                style={[styles.premiumBtn, { backgroundColor: COLORS.error }]}
                                onPress={() => setGameMode('REVIEW')}
                            >
                                <Text style={styles.premiumBtnText}>Review {reviewCount} Mistakes</Text>
                            </TouchableOpacity>
                        )}

                        {/* Option 2: Practice (Random) */}
                        <TouchableOpacity
                            style={styles.premiumBtn}
                            onPress={() => setGameMode('PRACTICE')}
                        >
                            <Text style={styles.premiumBtnText}>{t('practiceRandom') || 'Practice Randomly'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={styles.closeModalText}>Back to Menu</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        );
    }

    if (!question) return null;

    console.log("RENDER QUESTION STATE:", JSON.stringify(question, null, 2));

    const parts = question.sentence_en.split('[blank]');

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← {t('exit')}</Text>
                </TouchableOpacity>

                {/* POINTS DISPLAY */}
                <View style={styles.pointsBadge}>
                    <Text style={styles.pointsEmoji}>🌟</Text>
                    <Text style={styles.pointsText}>{sessionScore}</Text>
                </View>

                <View style={[styles.badge, styles[`badge_${level}`]]}>
                    <Text style={styles.badgeText}>{t('level')}: {t(level)}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.sentenceText}>
                    {parts[0]}
                    <View style={[styles.blankBox, isCorrect && styles.blankBoxSuccess]}>
                        <Text style={styles.blankText}>
                            {isCorrect ? '✨' : '___'}
                        </Text>
                    </View>
                    {parts[1]}
                </Text>

                <View style={styles.counterContainer}>
                    {isCorrect ? (
                        <TouchableOpacity style={styles.nextBtnInline} onPress={nextQuestion}>
                            <Text style={styles.nextBtnText}>{t('next')} →</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.counterText}>
                            {t('remaining')}: {totalCorrectNeeded - correctCount}
                        </Text>
                    )}
                </View>
            </View>

            {/* 1. Word Pool (Choices) - Now Above */}
            <View style={styles.wordPool}>
                {question.words.map((w) => {
                    const isFound = selectedWords.some(sw => sw.id === w.id);
                    if (isFound) return null;

                    return (
                        <TouchableOpacity
                            key={w.id}
                            style={styles.wordChip}
                            onPress={() => handleWordSelect(w)}
                        >
                            <Text style={styles.wordChipText}>{w.word_text}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* 2. Found Cards (History) - Now Below & REVERSED (Newest First) */}
            {/* 2. Found Cards (History) - Now Below & REVERSED (Newest First) */}
            <View style={styles.foundContainer}>
                {[...selectedWords].reverse().map((fw) => {
                    // Logic: If incorrect AND NOT premium, hide explanation
                    const showExplanation = fw.is_correct || isPremium;

                    return (
                        <View
                            key={fw.id}
                            style={[styles.foundChip, !fw.is_correct && styles.foundChipError]}
                        >
                            <Text style={[styles.foundChipText, !fw.is_correct && styles.foundChipTextError]}>
                                <Text style={{ fontWeight: '900' }}>{fw.word_text}</Text>

                                {showExplanation ? (
                                    fw.translations?.[userLang] ? `: ${fw.translations[userLang]}` : ''
                                ) : (
                                    <>
                                        : {t('incorrect')}.{' '}
                                        <Text
                                            style={{ textDecorationLine: 'underline', fontWeight: 'bold' }}
                                            onPress={() => setShowPremiumModal(true)}
                                        >
                                            {t('Why?')}
                                        </Text>
                                    </>
                                )}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* UPSELL MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showPremiumModal}
                onRequestClose={() => setShowPremiumModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalEmoji}>👑</Text>
                        <Text style={styles.modalTitle}>Go Premium!</Text>
                        <Text style={styles.modalDesc}>
                            Unlock detailed explanations for every mistake and learn faster.
                        </Text>

                        <TouchableOpacity style={styles.premiumBtn} onPress={() => Alert.alert('Coming Soon!', 'Payments integration pending.')}>
                            <Text style={styles.premiumBtnText}>Unlock Premium - $4.99</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowPremiumModal(false)}>
                            <Text style={styles.closeModalText}>Maybe later</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        paddingTop: 50,
        paddingHorizontal: LAYOUT.padding,
        paddingBottom: 50, // Bottom padding for scrolling
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    backBtn: {
        padding: 5,
    },
    backText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    badge: {
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    badge_easy: { backgroundColor: COLORS.levels.easy },
    badge_medium: { backgroundColor: COLORS.levels.medium },
    badge_hard: { backgroundColor: COLORS.levels.hard },
    badgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: LAYOUT.radius,
        padding: 25,
        marginBottom: 20,
        ...SHADOWS.medium,
        alignItems: 'center',
    },
    sentenceText: {
        fontSize: 22,
        color: COLORS.textPrimary,
        lineHeight: 34,
        textAlign: 'center',
    },
    blankBox: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginHorizontal: 5,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.textLight,
    },
    blankBoxSuccess: {
        backgroundColor: COLORS.success + '20', // transparent green
        borderBottomColor: COLORS.success,
    },
    blankText: {
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    counterContainer: {
        marginTop: 15,
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: COLORS.background,
        borderRadius: 10,
    },
    counterText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    successBanner: {
        backgroundColor: COLORS.success,
        borderRadius: LAYOUT.radius,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    successText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    nextBtnInline: {
        backgroundColor: COLORS.success,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 15,
        ...SHADOWS.small,
    },
    nextBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    foundContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    foundChip: {
        backgroundColor: COLORS.success,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '100%', // Prevent overflow off-screen
        ...SHADOWS.small,
    },
    foundChipError: {
        backgroundColor: '#FFE5E5',
        borderWidth: 1,
        borderColor: COLORS.error,
    },
    foundChipText: {
        color: '#fff',
        fontWeight: 'normal',
        marginRight: 5,
        flexShrink: 1, // Allow text to wrap if it gets too long
    },
    foundChipTextError: {
        color: COLORS.error,
    },
    checkMark: {
        color: '#fff',
        fontWeight: 'bold',
    },
    checkMarkError: {
        color: COLORS.error,
    },
    wordPool: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 30, // Gap between choices and history cards
    },
    wordChip: {
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxWidth: '100%', // Prevent overflow off-screen
        ...SHADOWS.small,
    },
    wordChipText: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    feedbackBanner: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        borderRadius: 12,
        padding: 15,
        ...SHADOWS.medium,
        zIndex: 100,
    },
    feedbackError: {
        backgroundColor: '#FFE5E5', // Light red
        borderLeftWidth: 5,
        borderLeftColor: COLORS.error,
    },
    feedbackInfo: {
        backgroundColor: '#E5F2FF',
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
    },
    feedbackTitle: {
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    feedbackText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    closeFeedback: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 5,
    },
    closeFeedbackText: {
        color: COLORS.textSecondary,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 30,
        alignItems: 'center',
        paddingBottom: 50,
        ...SHADOWS.medium,
    },
    modalEmoji: {
        fontSize: 50,
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 10,
    },
    modalDesc: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
    },
    premiumBtn: {
        backgroundColor: COLORS.primary, // Using primary color for call to action
        width: '100%',
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 15,
        ...SHADOWS.small,
    },
    premiumBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeModalText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
        padding: 10,
    },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
        ...SHADOWS.small,
    },
    pointsEmoji: {
        marginRight: 5,
        fontSize: 14,
    },
    pointsText: {
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
});
