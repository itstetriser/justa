
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Vibration, LayoutAnimation, Platform, UIManager, Alert, ScrollView, Modal, Animated, Easing, Image, TextInput, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getTranslation } from '../lib/translations';
import { fetchUserLevelProgress, markQuestionSeen, toggleQuestionFavorite, recordQuestionMistake, updateUserPointTransaction, updateUserStreak, resetLevelProgress, resolveQuestionMistake, markQuestionCompleted, recordAnswerStats, submitQuestionReport } from '../lib/api';
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
    const { level, category, appLang, userLang, isPremium, gameMode: initialGameMode, isHardMode = false } = route.params || {};

    // State
    const [gameMode, setGameMode] = useState(initialGameMode || 'NEW');
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedWords, setSelectedWords] = useState([]); // Array of word objects
    const [isCorrect, setIsCorrect] = useState(null); // true/false/null
    const [sessionScore, setSessionScore] = useState(0);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [showWinModal, setShowWinModal] = useState(false);
    const [mistakesInCurrent, setMistakesInCurrent] = useState(0);

    // Report State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportTopic, setReportTopic] = useState('');
    const [reportMessage, setReportMessage] = useState('');
    const [submittingReport, setSubmittingReport] = useState(false);

    // Animation for Pulsing Blank
    const blankOpacity = React.useRef(new Animated.Value(0.4)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(blankOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(blankOpacity, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);
    const [reportSuccess, setReportSuccess] = useState(false);


    // ... (existing code) ...

    const handleReportSubmit = async () => {
        if (!reportTopic) {
            Alert.alert("Topic Required", "Please select a topic.");
            return;
        }
        setSubmittingReport(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && question?.id) {
                await submitQuestionReport(user.id, question.id, reportTopic, reportMessage);
                console.log("Report sent successfully.");
                setReportSuccess(true);
                // Reset form data but keep modal open to show success
                setReportTopic('');
                setReportMessage('');
            }
        } catch (e) {
            Alert.alert("Error", "Failed to send report. Please try again.");
        } finally {
            setSubmittingReport(false);
        }
    };

    const closeReportModal = () => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportTopic('');
        setReportMessage('');
    };

    // ... (render) ...

    {/* Report Modal */ }
    <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeReportModal}
    >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '85%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 20, padding: 25, ...SHADOWS.large }}>

                <View>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: COLORS.slate[800], textAlign: 'center' }}>
                        Report Issue
                    </Text>

                    <Text style={{ marginBottom: 10, fontWeight: '600', color: COLORS.slate[600] }}>Select Topic:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                        {['Spelling', 'Grammar', 'Translation', 'Other'].map(topic => (
                            <TouchableOpacity
                                key={topic}
                                style={{
                                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                                    backgroundColor: reportTopic === topic ? COLORS.primary : COLORS.slate[100],
                                }}
                                onPress={() => !reportSuccess && setReportTopic(topic)}
                                disabled={reportSuccess}
                            >
                                <Text style={{ color: reportTopic === topic ? '#fff' : COLORS.slate[700], fontWeight: '500' }}>{topic}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={{ marginBottom: 10, fontWeight: '600', color: COLORS.slate[600] }}>Explanation (Optional):</Text>
                    <TextInput
                        style={{
                            backgroundColor: COLORS.slate[50], borderRadius: 10, padding: 12, height: 80,
                            textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.slate[200], marginBottom: 20
                        }}
                        placeholder="Describe the issue..."
                        multiline
                        value={reportMessage}
                        onChangeText={setReportMessage}
                        editable={!reportSuccess}
                    />

                    {reportSuccess ? (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                            <TouchableOpacity
                                style={{ width: '100%', paddingVertical: 15, borderRadius: 12, backgroundColor: COLORS.success, alignItems: 'center', marginBottom: 10 }}
                                disabled={true}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Report Sent</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={closeReportModal} style={{ marginTop: 5, padding: 10, alignItems: 'center' }}>
                                <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '600' }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={{ width: '100%', paddingVertical: 15, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', marginBottom: 10 }}
                                onPress={handleReportSubmit}
                                disabled={submittingReport}
                            >
                                {submittingReport ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Send Report</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={closeReportModal} style={{ marginTop: 5, padding: 10, alignItems: 'center' }}>
                                <Text style={{ color: '#999', fontSize: 14 }}>Cancel</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </View>
    </Modal>
    const [statsRecorded, setStatsRecorded] = useState(false);

    // Helpers
    const t = (key) => getTranslation(appLang, key);

    useFocusEffect(
        useCallback(() => {
            fetchQuestion();
            setSessionScore(0);
        }, [gameMode, level, category])
    );

    const fetchQuestion = async () => {
        try {
            setLoading(true);
            setIsCorrect(null);
            setSelectedWords([]);
            setShowWinModal(false);
            setStatsRecorded(false);
            setMistakesInCurrent(0);

            const { data: { user } } = await supabase.auth.getUser();

            // 1. Fetch Questions logic (Simplified for brevity, assumes standard flow)
            // Ideally we reuse the robust logic from previous version, just adapting UI
            // For now, I'll copy the robust fetch logic:

            let query = supabase.from('questions').select('*, word_stats(word_text, times_picked)').ilike('level', level);
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
        if (!question) return;

        // If validation logic...
        const isRight = wordObj.is_correct;

        // Optimistic UI updates
        const newSelected = [...selectedWords, { ...wordObj, status: isRight ? 'correct' : 'incorrect' }];
        setSelectedWords(newSelected); // Add to history stack

        const { data: { user } } = await supabase.auth.getUser();

        if (isRight) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Only add points if not already won (though technically correct words are disabled after selection anyway)
            if (!isCorrect) {
                setSessionScore(prev => prev + 10);
            }

            // Check if ALL correct words are found
            const totalCorrect = question.words.filter(w => w.is_correct).length;
            const foundCorrect = newSelected.filter(w => w.status === 'correct').length;
            if (foundCorrect >= totalCorrect) {
                setIsCorrect(true);
                if (user) {
                    markQuestionCompleted(user.id, level, question.id, true);
                }
            }

            if (user && !isCorrect) {
                // Background updates
                updateUserPointTransaction(user.id, 10);
                // Only record stats if game was NOT already won (though UI blocks this, good safety)
                if (question.id && !isCorrect) recordAnswerStats(question.id, wordObj.word_text, true, !statsRecorded);
            }
        } else {
            // WRONG ANSWER
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            const currentMistakeCount = mistakesInCurrent + 1;
            setMistakesInCurrent(currentMistakeCount);

            // Only penalty if game NOT won yet
            if (!isCorrect) {
                // HARD MODE: Strict. Every mistake counts.
                // EASY MODE: 1 Foregiveness. 
                const shouldPenalize = isHardMode ? true : (currentMistakeCount > 1);

                if (shouldPenalize) {
                    setSessionScore(prev => Math.max(0, prev - 5));
                    if (user) {
                        recordQuestionMistake(user.id, level, question.id);
                        if (question.id) recordAnswerStats(question.id, wordObj.word_text, false, !statsRecorded);
                    }
                    setStatsRecorded(true);
                } else {
                    // Start of Easy Mode Forgiveness logic
                    // We do NOT record mistake, do NOT deduct points.
                    // But we still record stats for the word itself (that many people picked it wrong)?
                    // User said "ignore that". Let's assume full ignore for user progress, but maybe still good to record stats?
                    // "mark it as mistaken" vs "ignore". 
                    // Let's strictly follow: "ignore that". So no DB calls.
                }
            }
        }
        // Logic note: isHardMode ? always record : record if > 1.
    };

    const toggleHeart = async () => {
        if (!question) return;
        setQuestion(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
        const { data: { user } } = await supabase.auth.getUser();
        await toggleQuestionFavorite(user.id, level, question.id);
    };



    if (loading || !question) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    // Split sentence
    const parts = question.sentence_en.split(/\[blank\]|\[_\]/);
    const foundCorrectWords = selectedWords.filter(w => w.status === 'correct');

    const getPickPercentage = (wordText) => {
        const stat = question.word_stats?.find(s => s.word_text === wordText);
        const count = stat ? stat.times_picked : 0;

        let total = question.times_asked || 0;
        if (!total && question.word_stats) {
            total = question.word_stats.reduce((acc, s) => acc + s.times_picked, 0);
        }

        if (!total) return 0;
        return Math.round((count / total) * 100);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>



            {/* 1. Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn}>
                    <FontAwesome5 name="arrow-left" size={20} color={COLORS.slate[800]} />
                </TouchableOpacity>

                <View style={styles.pillContainer}>
                    <View style={styles.pointsPill}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.slate[800] }}>Score: {sessionScore}</Text>
                    </View>
                </View>

                {/* Right Side: Report + Heart */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.roundBtn}>
                        <FontAwesome5 name="flag" size={18} color={COLORS.slate[800]} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleHeart} style={styles.roundBtn}>
                        <FontAwesome5
                            name="star"
                            size={18}
                            solid={question.isFavorite}
                            color={question.isFavorite ? COLORS.secondary : COLORS.slate[400]}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={{ width: '100%', height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
                <View style={{
                    width: `${Math.min(((foundCorrectWords.length) / (question.words.filter(w => w.is_correct).length)) * 100, 100)}%`,
                    height: '100%',
                    backgroundColor: COLORS.primary,
                    borderRadius: 3
                }} />
            </View>
            <View style={{ alignItems: 'center', marginTop: -15, marginBottom: 15 }}>
                <Text style={{ fontSize: 12, color: COLORS.slate[500], fontWeight: '600' }}>
                    {question.words.filter(w => w.is_correct).length - foundCorrectWords.length} words left
                </Text>
            </View>

            {/* 2. Mascot & Card */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>


                <View style={styles.questionCard}>
                    <Text style={styles.sentenceText}>
                        {parts[0]}
                        {foundCorrectWords.length > 0 ? (
                            <Text style={{ color: COLORS.success, textDecorationLine: 'underline', fontWeight: 'bold' }}>
                                {foundCorrectWords[foundCorrectWords.length - 1].word_text}
                            </Text>
                        ) : (
                            // Pulsing Blank
                            <Animated.Text style={{ opacity: blankOpacity, color: COLORS.primary, fontWeight: '900' }}>
                                {' _______ '}
                            </Animated.Text>
                        )}
                        {parts[1]}
                    </Text>

                    {/* Removed Translation Text as per previous step */}

                    <View style={styles.divider} />

                    <View style={styles.footerRow}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Removed text based remaining count */}
                        </View>
                    </View>
                </View>
            </View>

            {/* 3. Word Choices */}
            <Text style={styles.sectionLabel}>Choose all the correct words to complete the sentence</Text>
            <View style={styles.wordGrid}>
                {question.words.map((w, i) => {
                    const isSelected = selectedWords.some(sw => sw.id === w.id);
                    return (
                        <TouchableOpacity
                            key={i}
                            style={[
                                styles.wordBtn,
                                isSelected && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', opacity: 0.6 }
                            ]}
                            onPress={() => handleWordSelect(w)}
                            disabled={isSelected}
                        >
                            <Text style={[
                                styles.wordBtnText,
                                isSelected && { color: '#9CA3AF' }
                            ]}>{w.word_text}</Text>
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
                {selectedWords.slice().reverse().map((sw) => (
                    <View key={sw.id || sw.word_text} style={[
                        styles.feedbackCard,
                        sw.status === 'correct' ? styles.feedbackSuccess : styles.feedbackError
                    ]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                            <View style={[
                                styles.feedbackIcon,
                                { backgroundColor: sw.status === 'correct' ? '#D1FAE5' : '#FEE2E2' }
                            ]}>
                                <Text>{sw.status === 'correct' ? '✓' : '✕'}</Text>
                            </View>
                            <View style={{ marginLeft: 10, flex: 1 }}>
                                <Text style={{ fontWeight: 'bold', color: '#1F2937' }}>
                                    {sw.word_text}
                                </Text>
                                {/* Explanation / Translation Logic */}
                                {sw.status === 'correct' ? (
                                    <Text style={{ fontSize: 12, color: '#047857' }}>
                                        {(() => {
                                            const text = sw.translations?.[userLang] || sw.explanations?.[userLang] || "Correct!";
                                            return text.split(/\/ul\/(.*?)\/ul\//g).map((part, index) =>
                                                index % 2 === 1 ?
                                                    <Text key={index} style={{ textDecorationLine: 'underline' }}>{part}</Text> :
                                                    <Text key={index}>{part}</Text>
                                            );
                                        })()}
                                    </Text>
                                ) : (
                                    /* Incorrect + Premium Logic */
                                    (isPremium) ? (
                                        <Text style={{ fontSize: 12, color: '#B91C1C' }}>
                                            {(() => {
                                                const text = sw.explanations?.[userLang] || "Incorrect choice.";
                                                return text.split(/\/ul\/(.*?)\/ul\//g).map((part, index) =>
                                                    index % 2 === 1 ?
                                                        <Text key={index} style={{ textDecorationLine: 'underline' }}>{part}</Text> :
                                                        <Text key={index}>{part}</Text>
                                                );
                                            })()}
                                        </Text>
                                    ) : (
                                        <TouchableOpacity onPress={() => setShowPremiumModal(true)}>
                                            <Text style={{ fontSize: 12, color: '#B91C1C', textDecorationLine: 'underline', fontWeight: '600' }}>
                                                Incorrect. Why? 🔒
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>
                        </View>

                        {/* Right Side Actions */}
                        <View style={{ alignItems: 'flex-end', gap: 5 }}>
                            <View style={styles.percentBadge}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#065F46' }}>{getPickPercentage(sw.word_text)}% picked this</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            {/* Premium Upsell Modal */}
            <Modal
                visible={showPremiumModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPremiumModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: '85%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', ...SHADOWS.large }}>
                        <Text style={{ fontSize: 40, marginBottom: 15 }}>💎</Text>
                        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: COLORS.slate[800] }}>
                            Unlock Full Explanations
                        </Text>
                        <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666', lineHeight: 22 }}>
                            Understand your mistakes with detailed grammar explanations and translations. Go Pro to master the language faster!
                        </Text>

                        <TouchableOpacity
                            style={{ width: '100%', paddingVertical: 15, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', marginBottom: 10 }}
                            onPress={() => {
                                setShowPremiumModal(false);
                                navigation.navigate('Paywall'); // Ensure Paywall route exists
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Upgrade to Pro</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowPremiumModal(false)} style={{ marginTop: 10, padding: 10 }}>
                            <Text style={{ color: '#999', fontSize: 14 }}>Maybe Later</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Report Modal */}
            <Modal
                visible={showReportModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowReportModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: '85%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 20, padding: 25, ...SHADOWS.large }}>
                        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: COLORS.slate[800], textAlign: 'center' }}>
                            Report Issue
                        </Text>

                        <Text style={{ marginBottom: 10, fontWeight: '600', color: COLORS.slate[600] }}>Select Topic:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                            {['Spelling', 'Grammar', 'Translation', 'Other'].map(topic => (
                                <TouchableOpacity
                                    key={topic}
                                    style={{
                                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                                        backgroundColor: reportTopic === topic ? COLORS.primary : COLORS.slate[100],
                                    }}
                                    onPress={() => setReportTopic(topic)}
                                >
                                    <Text style={{ color: reportTopic === topic ? '#fff' : COLORS.slate[700], fontWeight: '500' }}>{topic}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={{ marginBottom: 10, fontWeight: '600', color: COLORS.slate[600] }}>Explanation (Optional):</Text>
                        <TextInput
                            style={{
                                backgroundColor: COLORS.slate[50], borderRadius: 10, padding: 12, height: 80,
                                textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.slate[200], marginBottom: 20
                            }}
                            placeholder="Describe the issue..."
                            multiline
                            value={reportMessage}
                            onChangeText={setReportMessage}
                        />

                        <TouchableOpacity
                            style={{ width: '100%', paddingVertical: 15, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', marginBottom: 10 }}
                            onPress={handleReportSubmit}
                            disabled={submittingReport}
                        >
                            {submittingReport ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Send Report</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowReportModal(false)} style={{ marginTop: 5, padding: 10, alignItems: 'center' }}>
                            <Text style={{ color: '#999', fontSize: 14 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4F8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: {
        padding: 20,
        paddingTop: 50,
        paddingBottom: 50,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center'
    },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
    pillContainer: { flexDirection: 'row', gap: 10 },
    pointsPill: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },



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
    // Word Grid
    sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 15, marginLeft: 5, letterSpacing: 1 },
    wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', justifyContent: 'center' }, // [CHANGED] Row Wrap
    wordBtn: {
        backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 16,
        minWidth: 100, alignItems: 'center', ...SHADOWS.small, borderWidth: 1, borderColor: '#fff'
    },
    wordBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },

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
