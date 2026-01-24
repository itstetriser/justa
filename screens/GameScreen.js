
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Vibration, LayoutAnimation, Platform, UIManager, Alert, ScrollView, Modal, Animated, Easing, Image, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getTranslation } from '../lib/translations';
import { fetchUserLevelProgress, markQuestionSeen, toggleQuestionFavorite, recordQuestionMistake, updateUserPointTransaction, updateUserStreak, resetLevelProgress, resolveQuestionMistake, markQuestionCompleted, recordAnswerStats, toggleSavedQuestion } from '../lib/api';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const screenWidth = Dimensions.get('window').width;

export default function GameScreen({ route, navigation }) {
    // Params
    const { level, category, appLang, userLang, isPremium, gameMode: initialGameMode } = route.params || {};

    // State
    const [gameMode, setGameMode] = useState(initialGameMode || 'NEW');
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedWords, setSelectedWords] = useState([]); // Array of word objects
    const [isCorrect, setIsCorrect] = useState(null); // true/false/null
    const [sessionScore, setSessionScore] = useState(0);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [showWinModal, setShowWinModal] = useState(false);

    // Stats tracking for session
    const [statsRecorded, setStatsRecorded] = useState(false);

    // Helpers
    const t = (key) => getTranslation(appLang, key);

    useFocusEffect(
        useCallback(() => {
            fetchQuestion();
            setSessionScore(0);
        }, [gameMode])
    );

    const fetchQuestion = async () => {
        try {
            setLoading(true);
            setIsCorrect(null);
            setSelectedWords([]);
            setShowWinModal(false);
            setStatsRecorded(false);

            const { data: { user } } = await supabase.auth.getUser();

            // 1. Fetch Questions logic (Simplified for brevity, assumes standard flow)
            // Ideally we reuse the robust logic from previous version, just adapting UI
            // For now, I'll copy the robust fetch logic:

            let query = supabase.from('questions').select('*').ilike('level', level);
            if (category) query = query.eq('category', category);

            const { data: allQuestions } = await query;

            if (!allQuestions?.length) {
                Alert.alert("No Questions", "None found for this level.");
                navigation.goBack();
                return;
            }

            const progress = await fetchUserLevelProgress(user.id, level);
            const seenSet = new Set(progress.seen_ids || []);
            const mistakeMap = progress.mistakes || {};
            const favSet = new Set(progress.favorite_ids || []);

            // Filter Pool
            let pool = [];
            if (gameMode === 'NEW') pool = allQuestions.filter(q => !seenSet.has(q.id));
            else if (gameMode === 'REVIEW') pool = allQuestions.filter(q => (mistakeMap[q.id] || 0) > 0);
            else if (gameMode === 'FAVORITES') pool = allQuestions.filter(q => favSet.has(q.id));
            else pool = allQuestions; // Default

            if (pool.length === 0) {
                if (gameMode === 'NEW') {
                    Alert.alert("Level Complete!", "You've seen all questions.", [{ text: 'OK', onPress: () => navigation.goBack() }]);
                } else {
                    Alert.alert("Empty", "No questions in this list.", [{ text: 'OK', onPress: () => navigation.goBack() }]);
                }
                setLoading(false);
                return;
            }

            const q = pool[Math.floor(Math.random() * pool.length)];

            // Parse words
            let parsedWords = [];
            const rawWords = q.words || q.word_pool;
            if (Array.isArray(rawWords)) parsedWords = rawWords;
            else if (typeof rawWords === 'string') parsedWords = JSON.parse(rawWords);

            parsedWords = parsedWords.map((w, index) => ({
                ...w,
                id: w.id || `temp-${index}`,
                word_text: w.word_text || w.word
            }));
            parsedWords.sort(() => Math.random() - 0.5);

            setQuestion({ ...q, words: parsedWords, isFavorite: favSet.has(q.id) });

        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to load");
        } finally {
            setLoading(false);
        }
    };

    const handleWordSelect = async (wordObj) => {
        if (!question || isCorrect) return;

        // If validation logic...
        const isRight = wordObj.is_correct;

        // Optimistic UI updates
        const newSelected = [...selectedWords, { ...wordObj, status: isRight ? 'correct' : 'incorrect' }];
        setSelectedWords(newSelected); // Add to history stack

        const { data: { user } } = await supabase.auth.getUser();

        if (isRight) {
            setIsCorrect(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSessionScore(prev => prev + 10);
            if (user) {
                // Background updates
                updateUserPointTransaction(user.id, 10);
                markQuestionCompleted(user.id, level, question.id, true);
                if (question.id) recordAnswerStats(question.id, wordObj.word_text, true, !statsRecorded);
            }
        } else {
            // Wrong
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setSessionScore(prev => Math.max(0, prev - 5));
            if (user) {
                recordQuestionMistake(user.id, level, question.id);
                if (question.id) recordAnswerStats(question.id, wordObj.word_text, false, !statsRecorded);
            }
        }
        setStatsRecorded(true);
    };

    const toggleHeart = async () => {
        if (!question) return;
        setQuestion(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
        const { data: { user } } = await supabase.auth.getUser();
        toggleSavedQuestion(user.id, question.id);
    };

    if (loading || !question) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    // Split sentence
    const parts = question.sentence_en.split(/\[blank\]|\[_\]/);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* 1. Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn}>
                    <Text style={{ fontSize: 20 }}>←</Text>
                </TouchableOpacity>

                <View style={styles.pillContainer}>
                    <View style={styles.pointsPill}>
                        <Text style={{ fontSize: 14 }}>✨ {sessionScore}</Text>
                    </View>
                    <View style={styles.levelPill}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A90E2', marginRight: 5 }} />
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4A90E2' }}>LEVEL: {level}</Text>
                    </View>
                </View>

                <TouchableOpacity onPress={toggleHeart} style={styles.roundBtn}>
                    <Text style={{ fontSize: 18, color: question.isFavorite ? COLORS.error : '#999' }}>
                        {question.isFavorite ? '❤️' : '♡'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 2. Mascot & Card */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Image
                    source={require('../assets/squirrel.png')}
                    style={{ width: 80, height: 80, resizeMode: 'contain', zIndex: 10, marginBottom: -25 }}
                />
                {/* Speech Bubble */}
                <View style={[styles.speechBubble, { alignSelf: 'flex-end', marginRight: 40, marginBottom: 10 }]}>
                    <Text style={{ fontSize: 12, color: '#555' }}>Fill the blank!</Text>
                </View>

                <View style={styles.questionCard}>
                    <Text style={styles.sentenceText}>
                        {parts[0]}
                        <Text style={{ color: isCorrect ? COLORS.success : '#ccc', textDecorationLine: 'underline' }}>
                            {isCorrect ? '  ' + (selectedWords.find(w => w.status === 'correct')?.word_text || '_____') + '  ' : ' _______ '}
                        </Text>
                        {parts[1]}
                    </Text>

                    <Text style={styles.translationText}>
                        ({question[`sentence_${userLang}`] || question.sentence_tr || "Translation unavailable"})
                    </Text>

                    <View style={styles.divider} />

                    <View style={styles.footerRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 16, opacity: 0.5, marginRight: 5 }}>📚</Text>
                            {/* Fallback if icon missing, just text */}
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#9CA3AF' }}>REMAINING: {question.words.filter(w => w.is_correct).length}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 3 }}>
                            {[1, 2, 3, 4].map(idx => (
                                <View key={idx} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' }} />
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* 3. Word Choices */}
            <Text style={styles.sectionLabel}>CHOOSE THE CORRECT WORD</Text>
            <View style={styles.wordGrid}>
                {question.words.map((w, i) => {
                    // If correctly guessed, maybe hide it? Or disable.
                    // The design usually keeps them but feedback appears below.
                    // Let's keep them clickable unless isCorrect is true globally.
                    return (
                        <TouchableOpacity
                            key={i}
                            style={styles.wordBtn}
                            onPress={() => handleWordSelect(w)}
                            disabled={isCorrect}
                        >
                            <Text style={styles.wordBtnText}>{w.word_text}</Text>
                        </TouchableOpacity>
                    )
                })}
            </View>

            {/* 4. Feedback Stack (Recent First) */}
            <View style={{ marginTop: 30, gap: 10 }}>
                {/* Win State: Show Next Button */}
                {isCorrect && (
                    <TouchableOpacity style={styles.nextBtn} onPress={fetchQuestion}>
                        <Text style={styles.nextBtnText}>Next Question →</Text>
                    </TouchableOpacity>
                )}

                {/* History Items */}
                {[...selectedWords].reverse().map((sw, idx) => (
                    <View key={idx} style={[
                        styles.feedbackCard,
                        sw.status === 'correct' ? styles.feedbackSuccess : styles.feedbackError
                    ]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={[
                                styles.feedbackIcon,
                                { backgroundColor: sw.status === 'correct' ? '#D1FAE5' : '#FEE2E2' }
                            ]}>
                                <Text>{sw.status === 'correct' ? '✓' : '✕'}</Text>
                            </View>
                            <Text style={{ marginLeft: 10, fontWeight: 'bold', color: '#1F2937' }}>
                                {sw.word_text} {sw.status === 'correct' ? `: ${sw.translations?.[userLang] || 'Meanings'}` : '(Incorrect)'}
                            </Text>
                        </View>

                        {sw.status === 'correct' && (
                            <View style={styles.percentBadge}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#065F46' }}>85% picked this</Text>
                            </View>
                        )}
                        {sw.status === 'incorrect' && (
                            <TouchableOpacity style={styles.whyBtn} onPress={() => Alert.alert("Explanation", "Need premium for AI explanation.")}>
                                <Text style={{ fontSize: 10, color: '#4A90E2', fontWeight: 'bold' }}> Why is this wrong?</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4F8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20, paddingTop: 50, paddingBottom: 50 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
    pillContainer: { flexDirection: 'row', gap: 10 },
    pointsPill: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
    levelPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },

    // Mascot
    speechBubble: {
        backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
        borderBottomLeftRadius: 0, ...SHADOWS.small
    },

    // Card
    questionCard: {
        width: '100%', backgroundColor: '#fff', borderRadius: 25, padding: 30,
        alignItems: 'center', ...SHADOWS.large
    },
    sentenceText: { fontSize: 24, textAlign: 'center', color: '#111827', marginBottom: 15, lineHeight: 34 },
    translationText: { fontSize: 16, textAlign: 'center', color: '#9CA3AF', marginBottom: 20 },
    divider: { width: '100%', height: 1, backgroundColor: '#F3F4F6', marginBottom: 15 },
    footerRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    // Word Grid
    sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 15, marginLeft: 5, letterSpacing: 1 },
    wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    wordBtn: {
        backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 16,
        minWidth: '45%', alignItems: 'center', ...SHADOWS.small, borderWidth: 1, borderColor: '#fff'
    },
    wordBtnText: { fontSize: 18, fontWeight: 'bold', color: '#374151' },

    // Feedback
    nextBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 10, ...SHADOWS.medium },
    nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

    feedbackCard: {
        flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 15,
        alignItems: 'center', justifyContent: 'space-between', borderWidth: 1
    },
    feedbackSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
    feedbackError: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },

    feedbackIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

    percentBadge: { backgroundColor: '#A7F3D0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    whyBtn: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }

});
