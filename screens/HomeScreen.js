
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Modal, Alert, Image, Animated, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, fetchUserStats, fetchLevelCounts, resetSeenQuestions, fetchUserLevelProgress } from '../lib/api';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { getTranslation } from '../lib/translations';

const { width } = Dimensions.get('window');

// Level Tree Cycle Icons
const LEVEL_ICONS = {
    'A1': '🌱', // Seedling
    'A2': '🌿', // Herb
    'B1': '🌳', // Tree
    'B2': '🌲', // Evergreen
    'C1': '🍎', // Fruit Tree
    'C2': '🏞️'  // Forest/Landscape
};

export default function HomeScreen({ navigation }) {
    const [userId, setUserId] = useState(null);

    // Practice & Modal States
    const [showPracticeModal, setShowPracticeModal] = useState(false);
    const [practiceCounts, setPracticeCounts] = useState({ new: 0, mistakes: 0, favorites: 0 });
    const [loadingPractice, setLoadingPractice] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [includeMistakesInReset, setIncludeMistakesInReset] = useState(false);

    const progressAnim = React.useRef(new Animated.Value(0)).current;

    // 1. Auth & Data Fetching
    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) setUserId(session.user.id);
        });
    }, []);

    const { data: profile, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['profile', userId],
        queryFn: () => fetchUserProfile(userId),
        enabled: !!userId,
    });

    const { data: userStats, refetch: refetchStats } = useQuery({
        queryKey: ['userStats', userId],
        queryFn: () => fetchUserStats(userId),
        enabled: !!userId
    });

    const currentLevel = (profile?.current_level || 'A1').toUpperCase();

    // Fetch counts specifically for the main "Practice" card display
    const { data: currentLevelCounts, refetch: refetchLevelCounts } = useQuery({
        queryKey: ['levelCounts', userId, currentLevel],
        queryFn: () => fetchLevelCounts(userId, currentLevel),
        enabled: !!userId && !!currentLevel
    });

    useFocusEffect(
        useCallback(() => {
            if (userId) {
                refetch();
                refetchStats();
                refetchLevelCounts();
            }
        }, [userId, refetch, refetchStats, refetchLevelCounts])
    );

    // Helpers
    const appLang = profile?.app_lang || 'en';
    const t = (key) => getTranslation(appLang, key);

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

    const handleStartPractice = async () => {
        setShowPracticeModal(true);
        // If we already have fresh data from useQuery, use it, else generic update
        if (currentLevelCounts) {
            setPracticeCounts({
                new: currentLevelCounts.newCount,
                mistakes: currentLevelCounts.mistakeCount,
                favorites: currentLevelCounts.favoriteCount,
            });
        } else {
            setLoadingPractice(true);
            try {
                const counts = await fetchLevelCounts(userId, currentLevel);
                setPracticeCounts({
                    new: counts.newCount,
                    mistakes: counts.mistakeCount,
                    favorites: counts.favoriteCount,
                });
            } catch (e) { console.error(e); }
            finally { setLoadingPractice(false); }
        }
    };

    const handleLaunchGame = async (mode) => {
        if (mode === 'NEW' && practiceCounts.new === 0) {
            setShowResetModal(true);
            return;
        }
        if (mode === 'REVIEW' && practiceCounts.mistakes === 0) {
            Alert.alert(t('oops'), t('noMistakes') || "No mistakes to review!");
            return;
        }
        if (mode === 'FAVORITES' && practiceCounts.favorites === 0) {
            Alert.alert(t('oops'), t('noFavoritesDesc') || "No favorites found.");
            return;
        }

        setShowPracticeModal(false);
        navigation.navigate('Game', {
            level: currentLevel,
            category: null,
            appLang: profile?.app_lang,
            userLang: profile?.native_lang,
            isPremium: profile?.is_premium,
            gameMode: mode
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
            refetchLevelCounts();
            setShowResetModal(false);
            setShowPracticeModal(false);
            navigation.navigate('Game', {
                level: currentLevel,
                gameMode: 'NEW',
                appLang: profile?.app_lang,
                userLang: profile?.native_lang
            });
        } catch (err) { Alert.alert('Error', 'Failed to restart'); }
        finally { setLoadingPractice(false); }
    };

    if (isLoading && !profile) {
        return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    }

    const sentencesSeen = currentLevelCounts?.seenCount || 0;
    const dailyGoalPoints = profile?.daily_goal || 100;
    const currentPoints = profile?.score_daily || 0;
    const pointsLeft = Math.max(0, dailyGoalPoints - currentPoints);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Header */}
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Welcome back, {profile?.username || 'Learner'}.</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <Text style={{ fontSize: 24 }}>☰</Text>
                    </TouchableOpacity>
                </View>

                {/* 2. Daily Goal Section */}
                <View style={[styles.sectionHeading, { marginTop: 10 }]}>
                    <Text style={styles.sectionTitle}>{t('dailyGoal')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <Text style={styles.editLink}>Edit</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.dailyGoalCard}>
                    <Text style={styles.dailyGoalText}>
                        {pointsLeft > 0
                            ? "Halfway there! Keep going."
                            : "Goal reached! Amazing work! 🎉"}
                    </Text>

                    <View style={styles.progressContainer}>
                        <Text style={styles.progressLabel}>{currentPoints} points</Text>
                        <Text style={styles.progressLabelRight}>{pointsLeft} left</Text>
                    </View>

                    <View style={styles.progressBarBg}>
                        <Animated.View style={[styles.progressBarFill, {
                            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        }]} />
                    </View>
                </View>


                {/* 3. Practice Section */}
                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Practice</Text>
                <View style={styles.practiceCard}>
                    <Text style={styles.practiceText}>
                        You have seen <Text style={{ fontWeight: 'bold' }}>{sentencesSeen}</Text> sentences in <Text style={{ fontWeight: 'bold' }}>{currentLevel}</Text> level.
                    </Text>

                    <TouchableOpacity style={styles.startPracticeBtn} onPress={handleStartPractice}>
                        <Text style={styles.startPracticeBtnText}>{t('startPractice') || "Start Practice"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleStartPractice()}>
                        {/* Re-using modal logic for Review, or specific logic if needed */}
                        <Text style={styles.reviewMistakesLink}>Review Mistakes</Text>
                    </TouchableOpacity>
                </View>


                {/* 4. Other Levels (Tree Lifecycle) */}
                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Other Levels</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ overflow: 'visible' }}>
                    {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
                        <TouchableOpacity key={lvl} style={styles.levelCircleContainer}>
                            <View style={[styles.levelCircle, lvl === currentLevel && styles.levelCircleActive]}>
                                <Text style={{ fontSize: 32 }}>{LEVEL_ICONS[lvl] || '🌱'}</Text>
                            </View>
                            <Text style={[styles.levelLabel, lvl === currentLevel && { fontWeight: 'bold', color: COLORS.primary }]}>{lvl}</Text>
                            {lvl === currentLevel && <View style={styles.activeDot} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>


                {/* 5. Statistics (Vertical List) */}
                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Statistics</Text>

                <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Current streak:</Text>
                    <Text style={styles.statRowValue}>{profile?.streak_count || 0} <Text style={{ fontWeight: 'normal', fontSize: 14 }}>Days</Text></Text>
                </View>

                <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Longest streak:</Text>
                    <Text style={styles.statRowValue}>{userStats?.max_streak || profile?.streak_count || 0} <Text style={{ fontWeight: 'normal', fontSize: 14 }}>Days</Text></Text>
                </View>

                <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Points this week:</Text>
                    <Text style={styles.statRowValue}>{profile?.score_weekly || 0}</Text>
                </View>

                <TouchableOpacity style={{ alignItems: 'center', marginTop: 15 }} onPress={() => navigation.navigate('Statistics')}>
                    <Text style={{ color: COLORS.textSecondary }}>See all</Text>
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>

            {/* --- MODALS --- */}
            <Modal
                visible={showPracticeModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPracticeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('startPractice')}</Text>
                        {loadingPractice ? <ActivityIndicator color={COLORS.primary} /> : (
                            <>
                                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={() => handleLaunchGame('NEW')}>
                                    <Text style={styles.modalBtnText}>{t('newQuestions')} ({practiceCounts.new})</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.secondary }]} onPress={() => handleLaunchGame('FAVORITES')}>
                                    <Text style={styles.modalBtnText}>{t('favoriteQuestions')} ({practiceCounts.favorites})</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.error }]} onPress={() => handleLaunchGame('REVIEW')}>
                                    <Text style={styles.modalBtnText}>{t('retryMistakes')} ({practiceCounts.mistakes})</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        <TouchableOpacity onPress={() => setShowPracticeModal(false)} style={{ marginTop: 15 }}>
                            <Text style={{ color: '#666' }}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showResetModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowResetModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={{ fontSize: 40, marginBottom: 10 }}>↻</Text>
                        <Text style={styles.modalTitle}>{t('restartList')}</Text>
                        <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>{t('restartDesc')}</Text>

                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, padding: 10, backgroundColor: COLORS.backgroundSecondary, borderRadius: 10, width: '100%' }}
                            onPress={() => setIncludeMistakesInReset(!includeMistakesInReset)}
                        >
                            <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: COLORS.primary, marginRight: 10, backgroundColor: includeMistakesInReset ? COLORS.primary : 'transparent' }} />
                            <Text>{t('addMistakenToNew')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={confirmDeckReset}>
                            <Text style={styles.modalBtnText}>{t('confirmRestart')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowResetModal(false)} style={{ marginTop: 15 }}>
                            <Text style={{ color: '#666' }}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: 50, // Safe area roughly
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingBottom: 40,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },

    // Sections
    sectionHeading: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 10
    },
    editLink: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },

    // Daily Goal Card
    dailyGoalCard: {
        backgroundColor: COLORS.cream,
        borderRadius: 16,
        padding: 20,
        marginBottom: 10
    },
    dailyGoalText: {
        fontSize: 16,
        color: '#5D4037', // Brownish text for cream bg
        textAlign: 'center',
        marginBottom: 15
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5
    },
    progressLabel: { fontSize: 12, color: '#5D4037' },
    progressLabelRight: { fontSize: 12, color: '#5D4037' },
    progressBarBg: {
        height: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 5,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#607D8B', // BlueGray from example
        borderRadius: 5
    },

    // Practice Card
    practiceCard: {
        backgroundColor: COLORS.mint,
        borderRadius: 16,
        padding: 25,
        alignItems: 'center',
        marginBottom: 10
    },
    practiceText: {
        fontSize: 16,
        color: '#37474F',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22
    },
    startPracticeBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15
    },
    startPracticeBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16
    },
    reviewMistakesLink: {
        color: COLORS.textSecondary,
        fontSize: 14,
        textDecorationLine: 'underline'
    },

    // Levels
    levelCircleContainer: {
        alignItems: 'center',
        marginRight: 20,
        width: 80,
    },
    levelCircle: {
        width: 70, height: 70,
        borderRadius: 35,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#fff',
        ...SHADOWS.small
    },
    levelCircleActive: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    levelLabel: {
        fontSize: 16,
        color: COLORS.textSecondary
    },
    activeDot: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary,
        marginTop: 4
    },

    // Stats
    statRow: {
        backgroundColor: COLORS.cream,
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    statRowLabel: {
        fontSize: 16,
        color: '#5D4037'
    },
    statRowValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#102A43'
    },

    // Modals (kept same styling, just simplified class names)
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center'
    },
    modalContent: {
        width: '85%', backgroundColor: '#fff', borderRadius: 20,
        padding: 25, alignItems: 'center', ...SHADOWS.large
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    modalBtn: {
        width: '100%', paddingVertical: 15, borderRadius: 12,
        alignItems: 'center', marginBottom: 10
    },
    modalBtnText: { color: '#fff', fontWeight: 'bold' }
});
