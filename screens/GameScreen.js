import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Vibration, LayoutAnimation, Platform, UIManager, Alert, ScrollView, Modal, Animated, Easing, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getTranslation } from '../lib/translations';
import { fetchUserLevelProgress, markQuestionSeen, toggleQuestionFavorite, recordQuestionMistake, updateUserPointTransaction, updateUserStreak, resetLevelProgress, resolveQuestionMistake, markQuestionCompleted } from '../lib/api';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const squirrelImg = require('../assets/squirrel.png');

export default function GameScreen({ route, navigation }) {
    // Play Statistics
    const [sessionMistakes, setSessionMistakes] = useState(0);
    const [currentQuestionMistakes, setCurrentQuestionMistakes] = useState(0); // Per-question count
    const [reviewCount, setReviewCount] = useState(0); // How many errors pending?

    const { level, category, appLang, userLang, isPremium, gameMode: initialGameMode } = route.params || {};

    // State
    const [gameMode, setGameMode] = useState(initialGameMode || 'NEW');
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedWords, setSelectedWords] = useState([]);
    const [isCorrect, setIsCorrect] = useState(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalCorrectNeeded, setTotalCorrectNeeded] = useState(0);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [levelComplete, setLevelComplete] = useState(false);
    const [showWinModal, setShowWinModal] = useState(false);

    // Squirrel Animation
    const squirrelAnim = React.useRef(new Animated.Value(0)).current;

    const handleSquirrelPress = () => {
        // Waving animation (rotation)
        Animated.sequence([
            Animated.timing(squirrelAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
            Animated.timing(squirrelAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
            Animated.timing(squirrelAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
            Animated.timing(squirrelAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
            Animated.timing(squirrelAnim, { toValue: 0, duration: 100, useNativeDriver: false })
        ]).start();
    };

    const squirrelRotate = squirrelAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-15deg', '0deg', '15deg']
    });

    // Favorite State
    const [isSaved, setIsSaved] = useState(false);

    const [sessionScore, setSessionScore] = useState(0);

    // Helper for translations (UI Language)
    const t = (key) => getTranslation(appLang, key);

    useFocusEffect(
        useCallback(() => {
            fetchQuestion();
            setSessionScore(0);
            return () => { };
        }, [gameMode])
    );

    const fetchQuestion = async () => {
        try {
            setLoading(true);
            setIsCorrect(null);
            setSelectedWords([]);
            setSessionMistakes(0);
            setLevelComplete(false);
            setShowWinModal(false);

            const { data: { user } } = await supabase.auth.getUser();

            // 1. Fetch ALL Questions for Level
            let query = supabase.from('questions').select('*').ilike('level', level);
            if (category) {
                query = query.eq('category', category);
            }
            const { data: allQuestions, error: qError } = await query;

            if (qError || !allQuestions?.length) {
                Alert.alert('Error', 'No questions found.');
                navigation.goBack();
                return;
            }

            // 2. Fetch Hybrid Progress (1 Row)
            const progress = await fetchUserLevelProgress(user.id, level);

            // Sets for O(1) lookup
            const seenSet = new Set(progress.seen_ids || []);
            const mistakeMap = progress.mistakes || {}; // {id: count}
            const favSet = new Set(progress.favorite_ids || []);

            // Calc Stats
            const pendingReviews = allQuestions.filter(q => (mistakeMap[q.id] || 0) > 0).length;
            setReviewCount(pendingReviews);

            // 3. Filter Pool
            let pool = [];

            if (gameMode === 'NEW') {
                // Not seen yet
                pool = allQuestions.filter(q => !seenSet.has(q.id));
            } else if (gameMode === 'REVIEW') {
                // Has mistakes
                pool = allQuestions.filter(q => (mistakeMap[q.id] || 0) > 0);
            } else if (gameMode === 'FAVORITES') {
                // Is Favorite
                pool = allQuestions.filter(q => favSet.has(q.id));
            } else {
                // PRACTICE: Everything (Fallback)
                pool = allQuestions;
            }

            // 4. Handle Empty Pool
            if (pool.length === 0) {
                if (gameMode === 'NEW') {
                    setLevelComplete(true);
                } else if (gameMode === 'REVIEW') {
                    Alert.alert(
                        t('greatJob') || 'Great Job',
                        t('noMistakes') || "You have no mistakes to review!",
                        [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                } else if (gameMode === 'FAVORITES') {
                    Alert.alert(
                        t('noFavorites') || 'No Favorites',
                        t('noFavoritesDesc') || 'You have no favorite questions in this level.',
                        [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                }
                setLoading(false);
                return;
            }

            // 5. Select Random
            const randomIndex = Math.floor(Math.random() * pool.length);
            const q = pool[randomIndex];

            // Parse Words
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

            setQuestion({ ...q, words: parsedWords, isFavorite: favSet.has(q.id) });
            setTotalCorrectNeeded(needed);
            setCorrectCount(0);
            setCurrentQuestionMistakes(0); // Reset for new question

            // Fetch Saved Status
            const isFav = await checkSavedStatus(user.id, q.id);
            setIsSaved(isFav);

        } catch (error) {
            console.error('Error fetching question:', error);
            Alert.alert('Error', 'Failed to load question');
        } finally {
            setLoading(false);
        }
    };

    const handleHeartPress = async () => {
        if (!question) return;
        const previousVal = question.isFavorite;
        const newVal = !previousVal;

        // Optimistic Update
        setQuestion(prev => ({ ...prev, isFavorite: newVal }));
        Haptics.selectionAsync();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log(`Toggling favorite: User=${user.id}, Level=${level}, Q=${question.id}`);
            await toggleQuestionFavorite(user.id, level, question.id);
        } catch (error) {
            console.error("Favorite Toggle Failed:", error);
            // Rollback
            setQuestion(prev => ({ ...prev, isFavorite: previousVal }));
            Alert.alert("Error", "Could not save favorite.");
        }
    };

    const handleWordSelect = async (wordObj) => {
        if (!question) return;
        if (isCorrect) return; // Stop interaction immediately if already won

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
                await updateUserPointTransaction(user.id, 10);
                await updateUserStreak(user.id);
            }

            // WIN CONDITION: Must find ALL correct answers
            if (currentCorrectCount >= totalCorrectNeeded) {
                setIsCorrect(true);
                setShowWinModal(true);

                // --- MARK COMPLETED (Atomic) ---
                // "Perfect" if no mistakes were made ON THIS QUESTION
                if (user && question) {
                    const isPerfect = currentQuestionMistakes === 0;
                    await markQuestionCompleted(user.id, level, question.id, isPerfect);
                }
            }
        } else {
            // Incorrect: Short Vibration
            Vibration.vibrate(50); // Distinct buzz
            setSessionMistakes(prev => prev + 1);
            setCurrentQuestionMistakes(prev => prev + 1);

            // -3 Points (ONLY if IsCorrect is NOT true yet)
            if (!isCorrect && user) {
                setSessionScore(prev => prev - 3);
                await updateUserPointTransaction(user.id, -3);
                // --- RECORD MISTAKE ---
                await recordQuestionMistake(user.id, level, question.id);
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

    const handleToggleFavorite = async () => {
        if (!question) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const newState = await toggleSavedQuestion(user.id, question.id);
                setIsSaved(newState);

                // Optional: Haptic feedback
                if (newState) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            }
        } catch (e) {
            console.error("Fav Error:", e);
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

    if (!question) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={{ fontSize: 40, marginBottom: 20 }}>❓</Text>
                <Text style={{ color: COLORS.textSecondary, marginBottom: 20 }}>
                    {loading ? 'Loading...' : 'No question loaded.'}
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.premiumBtn}>
                    <Text style={styles.premiumBtnText}>{t('backToMenu') || 'Back'}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    console.log("RENDER QUESTION STATE:", JSON.stringify(question, null, 2));

    const parts = question.sentence_en.split(/\[blank\]|\[_\]/);

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

                <View style={[styles.badge, { backgroundColor: COLORS.levels[level] || COLORS.primary }]}>
                    <Text style={styles.badgeText}>{t('level')}: {t(level)}</Text>
                </View>

                {/* HEART BTN */}
                <TouchableOpacity onPress={handleHeartPress} style={styles.heartBtn}>
                    <Text style={{ fontSize: 24 }}>{question.isFavorite ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.sentenceText}>
                    {parts[0]}
                    <View style={[styles.blankBox, isCorrect && styles.blankBoxSuccess]}>
                        <Text style={styles.blankText}>
                            {isCorrect ? selectedWords.find(w => w.is_correct)?.word_text : '___'}
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
                            style={[styles.wordChip, isCorrect && { opacity: 0.5 }]}
                            onPress={() => handleWordSelect(w)}
                            disabled={isCorrect}
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

                                {true ? (
                                    (fw.translations?.[userLang] || fw.explanations?.[userLang] || fw[`exp_${userLang}`] || fw.exp_en || fw.explanations?.['en'] || (fw.explanations ? Object.values(fw.explanations)[0] : ''))
                                        ? `: ${fw.translations?.[userLang] || fw.explanations?.[userLang] || fw[`exp_${userLang}`] || fw.exp_en || fw.explanations?.['en'] || (fw.explanations ? Object.values(fw.explanations)[0] : '')}`
                                        : ''
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
                        <Text style={styles.modalTitle}>{t('goPremium')}</Text>
                        <Text style={styles.modalDesc}>
                            {t('premiumDesc')}
                        </Text>

                        <TouchableOpacity style={styles.premiumBtn} onPress={() => Alert.alert('Coming Soon!', 'Payments integration pending.')}>
                            <Text style={styles.premiumBtnText}>{t('unlockPremium')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowPremiumModal(false)}>
                            <Text style={styles.closeModalText}>{t('maybeLater')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* WIN MODAL */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showWinModal}
                onRequestClose={() => setShowWinModal(false)}
            >
                <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
                    <View style={[styles.modalContent, { marginHorizontal: 20, borderRadius: 25 }]}>
                        {/* Animated Squirrel */}
                        <TouchableOpacity onPress={handleSquirrelPress} activeOpacity={0.8} style={{ marginBottom: 10, alignSelf: 'center' }}>
                            <Animated.Image
                                source={squirrelImg}
                                style={{
                                    width: 100,
                                    height: 100,
                                    resizeMode: 'contain',
                                    transform: [{ rotate: squirrelRotate }]
                                }}
                            />
                        </TouchableOpacity>

                        <Text style={styles.modalEmoji}>🎉</Text>
                        <Text style={styles.modalTitle}>{t('greatJob') || 'Great Job!'}</Text>
                        <Text style={styles.modalDesc}>
                            You found all the correct answers!
                        </Text>

                        {/* Option 1: Next Question */}
                        <TouchableOpacity
                            style={[styles.premiumBtn, { backgroundColor: COLORS.success }]}
                            onPress={() => {
                                setShowWinModal(false);
                                nextQuestion();
                            }}
                        >
                            <Text style={styles.premiumBtnText}>{t('nextQuestion') || 'Next Question'} →</Text>
                        </TouchableOpacity>

                        {/* Option 2: Favorite Button (Restored from Stash) */}
                        <TouchableOpacity
                            style={[styles.premiumBtn, { backgroundColor: question?.isFavorite ? '#ffcccc' : '#f0f0f0', borderWidth: 1, borderColor: question?.isFavorite ? COLORS.error : '#eee' }]}
                            onPress={handleHeartPress}
                        >
                            <Text style={[styles.premiumBtnText, { color: question?.isFavorite ? COLORS.error : COLORS.textPrimary }]}>
                                {question?.isFavorite ? "❤️ Remove from Favorites" : "🤍 Add to Favorites"}
                            </Text>
                        </TouchableOpacity>

                        {/* Option 3: See words (Review) */}
                        <TouchableOpacity
                            style={[styles.premiumBtn, { backgroundColor: question?.isFavorite ? '#ddd' : COLORS.secondary, marginTop: 10 }]}
                            onPress={() => {
                                handleHeartPress();
                                // Optionally close modal, but maybe they want to heart it and then go next?
                                // Let's keep modal open so they can see the heart toggle, or give feedback.
                                // Actually, handleHeartPress updates 'question' state, so this re-renders. 
                            }}
                        >
                            <Text style={[styles.premiumBtnText, { color: question?.isFavorite ? '#666' : '#fff' }]}>
                                {question?.isFavorite ? '💔 Remove from Favorites' : '❤️ Add to Favorites'}
                            </Text>
                        </TouchableOpacity>

                        {/* Option 3: See words (Review) */}
                        <TouchableOpacity
                            style={[styles.premiumBtn, { backgroundColor: COLORS.surface, marginTop: 10, borderWidth: 1, borderColor: '#ddd', elevation: 0 }]}
                            onPress={() => setShowWinModal(false)}
                        >
                            <Text style={[styles.premiumBtnText, { color: COLORS.textPrimary }]}>See other words</Text>
                        </TouchableOpacity>

                        {/* Option 3: Back to Menu */}
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={styles.closeModalText}>{t('backToMenu') || 'Back to Menu'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* LEVEL COMPLETE MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={levelComplete}
                onRequestClose={() => navigation.goBack()}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalEmoji}>🏅</Text>
                        <Text style={styles.modalTitle}>{t('levelComplete')}</Text>
                        <Text style={styles.modalDesc}>
                            {t('levelCompleteDesc').replace('{level}', level)}
                        </Text>

                        {/* Option 1: Restart Progress */}
                        <TouchableOpacity
                            style={[styles.premiumBtn, { backgroundColor: COLORS.primary }]}
                            onPress={async () => {
                                try {
                                    setLoading(true);
                                    const { data: { user } } = await supabase.auth.getUser();
                                    await resetLevelProgress(user.id, level);
                                    setLevelComplete(false);
                                    setGameMode('NEW');
                                } catch (e) {
                                    Alert.alert('Error', 'Failed to restart level');
                                    setLoading(false);
                                }
                            }}
                        >
                            <Text style={styles.premiumBtnText}>{t('restartLevel')}</Text>
                        </TouchableOpacity>

                        {/* Option 2: Review Mistakes */}
                        <TouchableOpacity
                            style={[styles.premiumBtn, { backgroundColor: COLORS.secondary }]}
                            onPress={() => {
                                setLevelComplete(false);
                                setGameMode('REVIEW');
                            }}
                        >
                            <Text style={styles.premiumBtnText}>{t('reviewMistakes')}</Text>
                        </TouchableOpacity>

                        {/* Option 3: Go Home */}
                        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                            <Text style={styles.closeModalText}>{t('backHome')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView >
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
    heartBtn: {
        marginLeft: 10,
        padding: 5,
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
    scoreBoard: {
        alignItems: 'center',
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center'
    },
    scoreLabel: {
        fontSize: 18,
        color: COLORS.textSecondary,
        fontWeight: 'bold'
    },
    scoreValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.textPrimary
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
