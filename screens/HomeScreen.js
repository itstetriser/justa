
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Modal, Alert, Image, Animated, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, fetchLevelCounts, resetSeenQuestions, fetchUserLevelProgress, updateUserLevel, updateDailyGoal } from '../lib/api';
import { COLORS, SHADOWS } from '../lib/theme';
import { getTranslation } from '../lib/translations';
import { ThemedText } from '../components/ThemedText';

const LEVEL_ICONS = {
    'A1': 'seedling',
    'A2': 'leaf',
    'B1': 'tree',
    'B2': 'pagelines',
    'C1': 'medal',
    'C2': 'crown',
};

// Map levels to specific visual elements (colors, icons) if needed more granularly
const LEVEL_THEMES = {
    'A1': { color: '#8BC34A', icon: 'seedling', label: 'A1' },
    'A2': { color: '#4CAF50', icon: 'leaf', label: 'A2' },
    'B1': { color: '#00BCD4', icon: 'tree', label: 'B1' },
    'B2': { color: '#2196F3', icon: 'pagelines', label: 'B2' },
    'C1': { color: '#9C27B0', icon: 'medal', label: 'C1' },
    'C2': { color: '#E91E63', icon: 'crown', label: 'C2' },
};

export default function HomeScreen({ navigation }) {
    const [userId, setUserId] = useState(null);
    const [userIdLoading, setUserIdLoading] = useState(true);

    // Practice & Modal States
    const [showPracticeModal, setShowPracticeModal] = useState(false);
    const [practiceCounts, setPracticeCounts] = useState({ new: 0, mistakes: 0, favorites: 0 });
    const [loadingPractice, setLoadingPractice] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [includeMistakesInReset, setIncludeMistakesInReset] = useState(false);
    const [isHardMode, setIsHardMode] = useState(false); // Default: Easy Mode

    // Config Modals
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [newDailyGoal, setNewDailyGoal] = useState('50');
    const [updatingConfig, setUpdatingConfig] = useState(false);

    const queryClient = useQueryClient();
    const progressAnim = React.useRef(new Animated.Value(0)).current;

    // 1. Auth & Data Fetching
    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) setUserId(session.user.id);
            setUserIdLoading(false);
        });
    }, []);

    const { data: profile, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['profile', userId],
        queryFn: () => fetchUserProfile(userId),
        enabled: !!userId,
    });

    // Helpers
    const currentLevel = (profile?.current_level || 'A1').toUpperCase();
    const appLang = profile?.app_lang || 'en';
    const t = (key) => getTranslation(appLang, key);

    const { data: levelCounts, refetch: refetchCounts } = useQuery({
        queryKey: ['levelCounts', userId, currentLevel],
        queryFn: () => fetchLevelCounts(userId, currentLevel),
        enabled: !!userId && !!currentLevel
    });

    useFocusEffect(
        useCallback(() => {
            if (userId) {
                refetch();
                refetchCounts();
            }
        }, [userId, refetch, refetchCounts])
    );

    // Animation for Daily Goal
    React.useEffect(() => {
        const goal = profile?.daily_goal || 100;
        const current = profile?.score_daily || 0;
        const percent = Math.min(current / goal, 1);
        Animated.timing(progressAnim, {
            toValue: percent,
            duration: 1000,
            useNativeDriver: false
        }).start();
    }, [profile]);

    // Update the local state for Goal Modal when profile loads
    React.useEffect(() => {
        if (profile?.daily_goal) {
            setNewDailyGoal(String(profile.daily_goal));
        }
    }, [profile]);

    const handleStartPractice = async () => {
        setLoadingPractice(true);
        try {
            const counts = await fetchLevelCounts(userId, currentLevel);
            setPracticeCounts({ ...counts }); // Safely spread since fetchLevelCounts returns an object

            if (counts.newCount > 0) {
                navigation.navigate('Game', {
                    level: currentLevel,
                    gameMode: 'NEW',
                    appLang: profile?.app_lang,
                    userLang: profile?.native_lang,
                    isPremium: profile?.is_premium,
                    isHardMode: isHardMode
                });
            } else {
                setShowResetModal(true);
            }
        } catch (e) {
            Alert.alert(t('oops'), 'Failed to start practice');
        } finally {
            setLoadingPractice(false);
        }
    };

    const handleLaunchGame = async (mode) => {
        // Reuse logic for Mistakes/Favorites
        if (mode === 'REVIEW' || mode === 'FAVORITES') {
            try {
                const progress = await fetchUserLevelProgress(userId, currentLevel);
                if (mode === 'REVIEW') {
                    const mistakeCount = Object.keys(progress.mistakes || {}).length;
                    if (mistakeCount === 0) {
                        Alert.alert(t('oops'), t('noMistakes') || "No mistakes to review!");
                        return;
                    }
                } else if (mode === 'FAVORITES') {
                    if (!progress.favorite_ids || progress.favorite_ids.length === 0) {
                        Alert.alert(t('oops'), t('noFavoritesDesc') || "No favorites found.");
                        return;
                    }
                }
            } catch (e) { console.warn(e); }
        }

        navigation.navigate('Game', {
            level: currentLevel,
            gameMode: mode,
            appLang: profile?.app_lang,
            userLang: profile?.native_lang,
            isPremium: profile?.is_premium,
            isHardMode: isHardMode
        });
    };

    const confirmDeckReset = async () => {
        try {
            setLoadingPractice(true);
            const freedCount = await resetSeenQuestions(userId, currentLevel, includeMistakesInReset, false);
            if (freedCount <= 0) {
                Alert.alert(t('oops'), "Nothing to restart.");
                return;
            }
            await handleStartPractice();
            setShowResetModal(false);
        } catch (err) { Alert.alert('Error', 'Failed to restart'); }
        finally { setLoadingPractice(false); }
    };

    const handleUpdateLevel = async (newLevel) => {
        try {
            setUpdatingConfig(true);
            await updateUserLevel(userId, newLevel);
            await refetch();
            setShowLevelModal(false);
        } catch (e) {
            Alert.alert('Error', 'Failed to update level');
        } finally {
            setUpdatingConfig(false);
        }
    };

    const handleSaveGoal = async () => {
        const val = parseInt(newDailyGoal);
        if (isNaN(val) || val <= 0) {
            Alert.alert("Invalid Goal", "Please enter a valid number");
            return;
        }
        try {
            setUpdatingConfig(true);
            await updateDailyGoal(userId, val);
            await refetch();
            setShowGoalModal(false);
        } catch (e) {
            Alert.alert("Error", "Failed to update daily goal");
        } finally {
            setUpdatingConfig(false);
        }
    };

    if ((isLoading && !profile) || userIdLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    }

    // Goal Calculation
    const dailyScore = profile?.score_daily || 0;
    const dailyGoal = profile?.daily_goal || 100;
    const progressPercent = Math.min((dailyScore / dailyGoal) * 100, 100);
    const remaining = Math.max(dailyGoal - dailyScore, 0);

    // Other Levels list
    const allLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const otherLevels = allLevels.filter(l => l !== currentLevel).slice(0, 3); // Showing 3 as per design

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <ThemedText style={styles.headerTitle} weight="bold">Welcome back, {profile?.username || 'Mina'}.</ThemedText>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                        <Feather name="menu" size={24} color={COLORS.slate[600]} />
                    </TouchableOpacity>
                </View>

                {/* Daily Goal */}
                <View style={styles.sectionHeaderRow}>
                    <ThemedText style={styles.sectionTitle} weight="medium">{t('dailyGoal') || 'Daily goal'}</ThemedText>
                    <TouchableOpacity onPress={() => setShowGoalModal(true)}>
                        <ThemedText style={styles.editLink}>{t('edit') || 'Edit'}</ThemedText>
                    </TouchableOpacity>
                </View>

                <View style={styles.goalCard}>
                    <ThemedText style={styles.goalMessage}>
                        {progressPercent >= 100 ? "Goal reached! Great job!" :
                            progressPercent >= 50 ? "Halfway there! Keep going." :
                                "Let's get started!"}
                    </ThemedText>

                    <ThemedText style={styles.goalPointsText} weight="medium">{dailyGoal} points</ThemedText>
                    <View style={styles.progressRow}>
                        <View style={styles.sliderContainer}>
                            <Animated.View style={[
                                styles.sliderFill,
                                { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }
                            ]} />
                        </View>
                        <ThemedText style={styles.remainingText} weight="medium">{remaining} left</ThemedText>
                    </View>
                </View>

                {/* Practice */}
                <ThemedText style={styles.sectionTitle} weight="medium">{t('practice') || 'Practice'}</ThemedText>
                <View style={styles.practiceCard}>
                    <ThemedText style={styles.practiceText}>
                        You have seen <ThemedText weight="bold" style={{ color: COLORS.slate[900] }}>{levelCounts?.seenCount || 0}</ThemedText> sentences in <ThemedText weight="bold" style={{ color: COLORS.slate[900] }}>{currentLevel}</ThemedText> level.
                    </ThemedText>

                    <TouchableOpacity
                        style={styles.startPracticeBtn}
                        onPress={handleStartPractice}
                        disabled={loadingPractice}
                    >
                        {loadingPractice ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={styles.startPracticeBtnText} weight="medium">{t('startPractice') || 'Start Practice'}</ThemedText>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={{ marginTop: 20 }} onPress={() => handleLaunchGame('REVIEW')}>
                        <ThemedText style={styles.reviewMistakesText}>{t('reviewMistakes') || 'Review Mistakes'}</ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Other Levels */}
                <ThemedText style={styles.sectionTitle} weight="medium">{t('otherLevels') || 'Other levels'}</ThemedText>
                <View style={styles.levelsContainer}>
                    {otherLevels.map((lvl) => (
                        <TouchableOpacity
                            key={lvl}
                            style={styles.levelCircleWrapper}
                            onPress={() => handleUpdateLevel(lvl)}
                        >
                            <View style={styles.levelCircleItem}>
                                <ThemedText style={styles.levelCircleLabel} weight="bold">{lvl}</ThemedText>
                                <FontAwesome5 name={LEVEL_THEMES[lvl]?.icon || 'seedling'} size={24} color={COLORS.secondary} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Statistics */}
                <ThemedText style={styles.sectionTitle} weight="medium">{t('statistics') || 'Statistics'}</ThemedText>
                <View style={[styles.statCard, { backgroundColor: COLORS.cardYellow }]}>
                    <ThemedText style={styles.statLabel}>{t('currentStreak') || 'Current streak'}:</ThemedText>
                    <ThemedText style={styles.statValue} weight="bold">{profile?.streak_count || 0} <ThemedText style={styles.statUnit}>days</ThemedText></ThemedText>
                </View>

                <View style={[styles.statCard, { backgroundColor: COLORS.white }]}>
                    <ThemedText style={styles.statLabel}>{t('longestStreak') || 'Longest streak'}:</ThemedText>
                    <ThemedText style={styles.statValue} weight="bold">{profile?.best_streak || 0} <ThemedText style={styles.statUnit}>days</ThemedText></ThemedText>
                </View>

                <View style={[styles.statCard, { backgroundColor: COLORS.cardYellow }]}>
                    <ThemedText style={styles.statLabel}>{t('pointsThisWeek') || 'Points this week'}:</ThemedText>
                    <ThemedText style={styles.statValue} weight="bold">{profile?.score_weekly || 0}</ThemedText>
                </View>

                <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('Stats')}>
                    <ThemedText style={styles.seeAllText}>{t('seeAll') || 'See all'}</ThemedText>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* --- MODALS --- */}

            {/* Reset Modal */}
            <Modal
                visible={showResetModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowResetModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={{ fontSize: 40, marginBottom: 10 }}>🎉</Text>
                        <ThemedText style={styles.modalTitle} weight="bold">{t('congrats') || "All Caught Up!"}</ThemedText>
                        <ThemedText style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
                            {t('restartDesc') || "You've seen all questions in this level."}
                        </ThemedText>
                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={confirmDeckReset}>
                            <ThemedText style={styles.modalBtnText} weight="bold">{t('restartList') || "Restart Level"}</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowResetModal(false)} style={{ marginTop: 15 }}>
                            <ThemedText style={{ color: '#666' }}>{t('cancel')}</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Daily Goal Modal */}
            <Modal
                visible={showGoalModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGoalModal(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle} weight="bold">{t('setDailyGoal') || "Set Daily Goal"}</ThemedText>

                        <TextInput
                            style={styles.input}
                            value={newDailyGoal}
                            onChangeText={setNewDailyGoal}
                            keyboardType="numeric"
                            placeholder="e.g. 100"
                        />

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
                            {[50, 100, 200, 500].map(val => (
                                <TouchableOpacity key={val} onPress={() => setNewDailyGoal(String(val))} style={{ padding: 8, backgroundColor: COLORS.slate[100], borderRadius: 8 }}>
                                    <ThemedText>{val} pts</ThemedText>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {updatingConfig ? <ActivityIndicator color={COLORS.primary} /> : (
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={handleSaveGoal}>
                                <ThemedText style={styles.modalBtnText} weight="bold">{t('save') || "Save"}</ThemedText>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setShowGoalModal(false)} style={{ marginTop: 15 }}>
                            <ThemedText style={{ color: '#666' }}>{t('cancel')}</ThemedText>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // White bg as per image
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: {
        padding: 24,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 18, // Checked: bold 18
        color: COLORS.textMain,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 22, // Checked: medium 22
        color: COLORS.textMain,
        marginBottom: 16, // Spacing might need adj, but fontSize is key
        marginTop: 10,
    },
    editLink: {
        fontSize: 14,
        color: COLORS.slate[500],
    },

    // Daily Goal Card
    goalCard: {
        backgroundColor: COLORS.cardYellow,
        borderRadius: 8,
        padding: 20,
        marginBottom: 32,
    },
    goalMessage: {
        fontSize: 16, // Checked: regular 16
        color: COLORS.textMain,
        textAlign: 'center',
        marginBottom: 16,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sliderContainer: {
        flex: 1,
        height: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        marginRight: 12,
        overflow: 'hidden',
    },
    sliderFill: {
        height: '100%',
        backgroundColor: COLORS.progressBar,
        borderRadius: 6,
    },
    remainingText: {
        fontSize: 13, // Checked: medium 13
        color: COLORS.textMain,
    },
    goalPointsText: {
        fontSize: 13, // Checked: medium 13
        color: COLORS.textMain,
        marginBottom: 4,
    },

    // Practice Card
    practiceCard: {
        backgroundColor: COLORS.cardGray,
        borderRadius: 8,
        padding: 24,
        alignItems: 'center',
        marginBottom: 32,
    },
    practiceText: {
        fontSize: 16, // Checked: regular 16
        color: COLORS.textMain,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    startPracticeBtn: {
        backgroundColor: '#0F172A',
        width: '80%',
        paddingVertical: 14,
        borderRadius: 6,
        alignItems: 'center',
        ...SHADOWS.small
    },
    startPracticeBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    reviewMistakesText: {
        color: '#475569',
        fontSize: 14,
        textDecorationLine: 'underline',
    },

    // Levels (Circular)
    levelsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: 16,
    },
    levelCircleWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    levelCircleItem: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    levelCircleLabel: {
        fontSize: 16,
        marginBottom: 4,
        color: COLORS.textMain,
    },

    // Statistics
    statCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    statLabel: {
        fontSize: 16, // Checked: regular 16
        color: COLORS.textMain,
    },
    statValue: {
        fontSize: 16, // Checked: bold 16
        color: COLORS.textMain,
    },
    statUnit: {
        fontSize: 14,
        fontWeight: 'normal',
        color: '#64748B',
    },
    seeAllBtn: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'transparent'
    },
    seeAllText: {
        color: '#475569',
        fontSize: 14,
        // textDecorationLine: 'underline', // Image doesn't show underline maybe?
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 20,
        padding: 25, alignItems: 'center', ...SHADOWS.large
    },
    modalTitle: {
        fontSize: 22, marginBottom: 15,
        color: COLORS.slate[800],
        textAlign: 'center',
    },
    modalBtn: {
        width: '100%', paddingVertical: 15, borderRadius: 12,
        alignItems: 'center', marginBottom: 10
    },
    modalBtnText: {
        color: '#fff',
    },
    input: {
        width: '100%',
        padding: 15,
        borderWidth: 1,
        borderColor: COLORS.slate[300],
        borderRadius: 12,
        marginBottom: 20,
        fontSize: 18,
        textAlign: 'center',
        fontFamily: 'Satoshi-Regular'
    }
});
