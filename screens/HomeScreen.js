
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Modal, Alert, Image, Animated, Easing, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, fetchUserStats, fetchLevelCounts, resetSeenQuestions, fetchUserLevelProgress } from '../lib/api';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { getTranslation } from '../lib/translations';
import WordOfTheDay from '../components/WordOfTheDay';
import { LinearGradient } from 'expo-linear-gradient'; // Ensure expo-linear-gradient is installed

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
    const [userId, setUserId] = useState(null);
    const [stats, setStats] = useState(null); // Local stats state for immediate rendering if needed

    // Practice & Modal States
    const [showPracticeModal, setShowPracticeModal] = useState(false);
    const [practiceCounts, setPracticeCounts] = useState({ new: 0, mistakes: 0, favorites: 0 });
    const [loadingPractice, setLoadingPractice] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [includeMistakesInReset, setIncludeMistakesInReset] = useState(false);

    const queryClient = useQueryClient();
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

    useFocusEffect(
        useCallback(() => {
            if (userId) {
                refetch();
                refetchStats();
            }
        }, [userId, refetch, refetchStats])
    );

    // Helpers
    const currentLevel = (profile?.current_level || 'A1').toUpperCase();
    const appLang = profile?.app_lang || 'en';
    const t = (key) => getTranslation(appLang, key);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

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
        setLoadingPractice(true);
        try {
            const counts = await fetchLevelCounts(userId, currentLevel);
            setPracticeCounts({
                new: counts.newCount,
                mistakes: counts.mistakeCount,
                favorites: counts.favoriteCount,
                seen: counts.seenCount,
                total: counts.totalCount
            });
        } catch (e) {
            console.error("Failed to fetch counts:", e);
        } finally {
            setLoadingPractice(false);
        }
    };

    // -- COPIED LOGIC FROM OLD FILE FOR LAUNCHING GAME --
    const handleLaunchGame = async (mode) => {
        if (mode === 'NEW' && practiceCounts.new === 0) {
            setShowResetModal(true);
            return;
        }
        if (mode === 'REVIEW' || mode === 'FAVORITES') {
            try {
                const progress = await fetchUserLevelProgress(userId, currentLevel);
                if (mode === 'REVIEW') {
                    const mistakeCount = Object.values(progress.mistakes || {}).reduce((a, b) => a + b, 0);
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
            await handleStartPractice(); // Refresh counts
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
    // ----------------------------------------------------

    if (isLoading && !profile) {
        return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            {/* Background Decoration (Subtle Shapes) */}
            <View style={styles.bgDecoration1} />
            <View style={styles.bgDecoration2} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.dateText}>{today}</Text>
                        <Text style={styles.welcomeText}>{t('welcome')}, {profile?.username || 'Learner'}!</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.notifBtn}>
                        <Text style={{ fontSize: 20 }}>🔔</Text>
                        {/* Settings mapped to Bell for now based on design placement implies notifications/settings */}
                    </TouchableOpacity>
                </View>

                {/* Daily Goal Strip */}
                <View style={styles.goalStrip}>
                    <View style={styles.goalIconCircle}>
                        <Text style={{ fontSize: 18 }}>🎯</Text>
                        {/* Design uses a concentric circle icon, using generic target emoji or similar */}
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={styles.goalTitle}>{t('dailyGoal')}</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                                {/* Assuming goal edit is in settings or separate modal, kept simple for now */}
                                <Text style={{ fontSize: 14, color: COLORS.primary }}>✎</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.progressBarBg}>
                            <Animated.View style={[styles.progressBarFill, {
                                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                            }]} />
                        </View>
                    </View>
                </View>

                {/* Grid Stats */}
                <View style={styles.gridContainer}>
                    {/* Card 1: Points */}
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFF9C4' }]}>
                            <Text style={{ fontSize: 22 }}>🏆</Text>
                        </View>
                        <Text style={styles.statValue}>{profile?.score_total || 0}</Text>
                        <Text style={styles.statLabel}>Points Earned</Text>
                    </View>

                    {/* Card 2: Streak */}
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFE0B2' }]}>
                            <Text style={{ fontSize: 22 }}>🔥</Text>
                        </View>
                        <Text style={styles.statValue}>{profile?.streak_count || 0}</Text>
                        <Text style={styles.statLabel}>Days Fire</Text>
                    </View>

                    {/* Card 3: Questions (Lifetime) */}
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#C8E6C9' }]}>
                            <Text style={{ fontSize: 22 }}>📖</Text>
                        </View>
                        <Text style={styles.statValue}>{userStats?.questions_seen || 0}</Text>
                        <Text style={[styles.statLabel, { color: '#888' }]}>Lifetime</Text>
                        <Text style={styles.statLabel}>Questions</Text>
                    </View>

                    {/* Card 4: Words Seen */}
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#E1BEE7' }]}>
                            <Text style={{ fontSize: 22 }}>T</Text>
                        </View>
                        <Text style={styles.statValue}>{userStats?.words_seen || 0}</Text>
                        <Text style={[styles.statLabel, { color: '#888' }]}>Lifetime</Text>
                        <Text style={styles.statLabel}>Words Seen</Text>
                    </View>
                </View>

                {/* Word of the Day */}
                <View style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={styles.sectionHeader}>Word of the Day</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('ManageWotd')}>
                            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>View Archive</Text>
                        </TouchableOpacity>
                    </View>
                    <WordOfTheDay
                        userId={userId}
                        level={currentLevel}
                        appLang={appLang}
                        // Pass a style/prop if component supports customizations, 
                        // but for now relying on component's internal structure which fits well enough
                        onBonusClaimed={refetch}
                    />
                </View>

                <View style={{ height: 100 }} />
                {/* Spacer for floating button */}

            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fabContainer} onPress={handleStartPractice}>
                <LinearGradient
                    colors={['#4A90E2', '#357ABD']}
                    style={styles.fab}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.fabText}>Start Practice</Text>
                    <Text style={{ fontSize: 20, color: '#fff', marginLeft: 10 }}>→</Text>
                </LinearGradient>
            </TouchableOpacity>

            {/* --- MODALS (Reused from logic) --- */}
            {<Modal
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
            </Modal>}

            {/* Reset Modal */}
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
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, padding: 10, backgroundColor: COLORS.background, borderRadius: 10, width: '100%' }}
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
        backgroundColor: '#F5F7FA', // Light blue-ish gray
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    bgDecoration1: {
        position: 'absolute',
        top: -100, left: -50,
        width: 300, height: 300,
        borderRadius: 150,
        backgroundColor: '#E3F2FD',
        opacity: 0.5,
    },
    bgDecoration2: {
        position: 'absolute',
        top: 100, right: -100,
        width: 400, height: 400,
        borderRadius: 200,
        backgroundColor: '#F3E5F5', // Light purple tint
        opacity: 0.3,
    },
    scrollContent: {
        padding: LAYOUT.padding,
        paddingTop: 60,
    },
    header: {
        marginBottom: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    dateText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 5
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937' // Dark gray
    },
    notifBtn: {
        padding: 5,
        backgroundColor: '#fff',
        borderRadius: 20,
        ...SHADOWS.small
    },
    goalStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 40,
        padding: 10,
        marginBottom: 30,
        ...SHADOWS.small
    },
    goalIconCircle: {
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: '#E8EAF6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 5
    },
    goalTitle: {
        fontWeight: 'bold',
        color: '#374151',
        fontSize: 14
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4A90E2',
        borderRadius: 3
    },
    // GRID
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 15,
        marginBottom: 30
    },
    statCard: {
        width: (width - 60) / 2, // 2 cols with padding
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        ...SHADOWS.medium,
        alignItems: 'flex-start'
    },
    iconCircle: {
        width: 45, height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500'
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827'
    },
    // FAB
    fabContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        ...SHADOWS.large
    },
    fab: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 18,
        borderRadius: 16,
    },
    fabText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Modals
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center'
    },
    modalContent: {
        width: '85%', backgroundColor: '#fff', borderRadius: 20,
        padding: 25, alignItems: 'center', ...SHADOWS.large
    },
    modalTitle: {
        fontSize: 22, fontWeight: 'bold', marginBottom: 15
    },
    modalBtn: {
        width: '100%', paddingVertical: 15, borderRadius: 12,
        alignItems: 'center', marginBottom: 10
    },
    modalBtnText: {
        color: '#fff', fontWeight: 'bold'
    }
});
