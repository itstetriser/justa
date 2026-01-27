
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Modal, Alert, Image, Animated, Easing, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, fetchUserStats, fetchLevelCounts, resetSeenQuestions, fetchUserLevelProgress, updateUserLevel, updateUserLanguage } from '../lib/api';
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

    // Config Modals
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [showLangModal, setShowLangModal] = useState(false);
    const [updatingConfig, setUpdatingConfig] = useState(false);

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

    // Helpers
    const currentLevel = (profile?.current_level || 'A1').toUpperCase();
    const appLang = profile?.app_lang || 'en';
    const t = (key) => getTranslation(appLang, key);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    const { data: userStats, refetch: refetchStats } = useQuery({
        queryKey: ['userStats', userId],
        queryFn: () => fetchUserStats(userId),
        enabled: !!userId
    });

    const { data: levelCounts, refetch: refetchCounts } = useQuery({
        queryKey: ['levelCounts', userId, currentLevel],
        queryFn: () => fetchLevelCounts(userId, currentLevel),
        enabled: !!userId && !!currentLevel
    });

    useFocusEffect(
        useCallback(() => {
            if (userId) {
                refetch();
                refetchStats();
                refetchCounts();
            }
        }, [userId, refetch, refetchStats, refetchCounts])
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

    const handleStartPractice = async () => {
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

            if (counts.newCount > 0) {
                navigation.navigate('Game', {
                    level: currentLevel,
                    category: null,
                    appLang: profile?.app_lang,
                    userLang: profile?.native_lang,
                    isPremium: profile?.is_premium,
                    gameMode: 'NEW'
                });
            } else {
                setShowResetModal(true);
            }
        } catch (e) {
            console.error("Failed to fetch counts:", e);
            Alert.alert(t('oops'), 'Failed to start practice');
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

    const handleUpdateLanguage = async (newLang) => {
        try {
            setUpdatingConfig(true);
            await updateUserLanguage(userId, newLang);
            await refetch();
            setShowLangModal(false);
        } catch (e) {
            Alert.alert('Error', 'Failed to update language');
        } finally {
            setUpdatingConfig(false);
        }
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
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
            >
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.appTitle}>Fillt</Text>

                        <TouchableOpacity
                            style={styles.headerBadge}
                            onPress={() => setShowLevelModal(true)}
                        >
                            <Text style={styles.headerBadgeText}>{currentLevel}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.headerBadge, { backgroundColor: '#fee2e2' }]}
                            onPress={() => setShowLangModal(true)}
                        >
                            <Text style={[styles.headerBadgeText, { color: '#ef4444' }]}>
                                {profile?.app_lang === 'tr' ? '🇹🇷' : '🇺🇸'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
                        <Text style={{ fontSize: 22 }}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                {/* Hero Section: Daily Goal */}
                <LinearGradient
                    colors={[COLORS.slate[700], COLORS.slate[800]]}
                    style={styles.heroCard}
                >
                    <View style={styles.goalContainer}>
                        <View style={styles.goalCircle}>
                            {/* Liquid Fill Effect */}
                            <Animated.View style={[styles.liquidFill, {
                                height: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                            }]} />
                            <View style={styles.goalContent}>
                                <Text style={styles.goalLabel}>{t('dailyGoal')}</Text>
                                <Text style={styles.goalValue}>
                                    {profile?.score_daily || 0}
                                    <Text style={styles.goalTarget}> / {profile?.daily_goal || 100}</Text>
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Primary Action */}
                    <TouchableOpacity style={styles.startBtn} onPress={handleStartPractice}>
                        <Text style={styles.startBtnText}>{t('startPractice') || "Start Practice"}</Text>
                    </TouchableOpacity>

                    {/* Secondary Actions */}
                    <View style={styles.secondaryActions}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleLaunchGame('REVIEW')}>
                            <Text style={styles.secondaryBtnText}>{t('retryMistakes')}  ({levelCounts?.mistakeCount || 0})</Text>
                        </TouchableOpacity>
                        <View style={{ width: 10 }} />
                        <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleLaunchGame('FAVORITES')}>
                            <Text style={styles.secondaryBtnText}>{t('favoriteQuestions')}  ({levelCounts?.favoriteCount || 0})</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Word of the Day */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Word of the Day</Text>
                    <WordOfTheDay
                        userId={userId}
                        level={currentLevel}
                        appLang={appLang}
                        onBonusClaimed={refetch}
                    />
                </View>


                {/* Statistics List */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Statistics</Text>
                    <View style={styles.statsCard}>
                        {/* Row 1: Streak */}
                        <View style={styles.statRow}>
                            <Text style={styles.statRowLabel}>Current Streak</Text>
                            <Text style={styles.statRowValue}>{profile?.streak_count || 0} days</Text>
                        </View>
                        <View style={styles.divider} />

                        {/* Row 2: Longest Streak (mocked if not in DB, assuming maybe same for now or hidden) */}
                        {/* Assuming we might not have 'longest_streak' in profile, skipping or using streak */}
                        <View style={styles.statRow}>
                            <Text style={styles.statRowLabel}>Longest streak</Text>
                            <Text style={styles.statRowValue}>{profile?.streak_max || profile?.streak_count || 0} days</Text>
                        </View>
                        <View style={styles.divider} />

                        {/* Row 3: Points Today */}
                        <View style={styles.statRow}>
                            <Text style={styles.statRowLabel}>Points today</Text>
                            <Text style={styles.statRowValue}>{profile?.score_daily || 0}</Text>
                        </View>
                        <View style={styles.divider} />

                        {/* Row 4: Total Points */}
                        <View style={styles.statRow}>
                            <Text style={styles.statRowLabel}>Total Points</Text>
                            <Text style={styles.statRowValue}>{profile?.score_total || 0}</Text>
                        </View>
                    </View>
                </View>



                <View style={{ height: 100 }} />
                {/* Spacer for floating button */}

            </ScrollView>



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

            {/* Level Modal */}
            <Modal
                visible={showLevelModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLevelModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Level</Text>
                        {updatingConfig ? <ActivityIndicator size="large" color={COLORS.primary} /> : (
                            <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                                    <TouchableOpacity
                                        key={lvl}
                                        style={[
                                            styles.configOption,
                                            currentLevel === lvl && styles.configOptionActive,
                                            { backgroundColor: currentLevel === lvl ? COLORS.primary : COLORS.slate[100] }
                                        ]}
                                        onPress={() => handleUpdateLevel(lvl)}
                                    >
                                        <Text style={[
                                            styles.configOptionText,
                                            currentLevel === lvl && { color: '#fff' }
                                        ]}>{lvl}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <TouchableOpacity onPress={() => setShowLevelModal(false)} style={{ marginTop: 20 }}>
                            <Text style={{ color: COLORS.slate[500] }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Language Modal */}
            <Modal
                visible={showLangModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLangModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Language</Text>
                        {updatingConfig ? <ActivityIndicator size="large" color={COLORS.primary} /> : (
                            <View style={{ width: '100%' }}>
                                <TouchableOpacity
                                    style={[styles.langOption, profile?.app_lang === 'en' && styles.langOptionActive]}
                                    onPress={() => handleUpdateLanguage('en')}
                                >
                                    <Text style={{ fontSize: 30, marginRight: 15 }}>🇺🇸</Text>
                                    <Text style={[styles.langText, profile?.app_lang === 'en' && { fontWeight: 'bold' }]}>English</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.langOption, profile?.app_lang === 'tr' && styles.langOptionActive]}
                                    onPress={() => handleUpdateLanguage('tr')}
                                >
                                    <Text style={{ fontSize: 30, marginRight: 15 }}>🇹🇷</Text>
                                    <Text style={[styles.langText, profile?.app_lang === 'tr' && { fontWeight: 'bold' }]}>Turkish</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity onPress={() => setShowLangModal(false)} style={{ marginTop: 20 }}>
                            <Text style={{ color: COLORS.slate[500] }}>Cancel</Text>
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
        backgroundColor: '#F8FAFC', // Slate 50
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    bgDecoration1: {
        position: 'absolute', top: -100, left: -50, width: 300, height: 300,
        borderRadius: 150, backgroundColor: '#E0E7FF', opacity: 0.5, // Indigo tint
    },
    bgDecoration2: {
        position: 'absolute', top: 100, right: -100, width: 400, height: 400,
        borderRadius: 200, backgroundColor: '#F1F5F9', opacity: 0.8, // Slate tint
    },
    scrollContent: {
        padding: 20,
        paddingTop: 60,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    appTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.slate[800],
        marginRight: 5
    },
    headerBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: COLORS.slate[200],
    },
    headerBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.slate[700]
    },
    settingsBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        ...SHADOWS.small
    },
    // Hero Card
    heroCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        ...SHADOWS.medium,
        alignItems: 'center'
    },
    goalContainer: {
        marginBottom: 24
    },
    goalCircle: {
        width: 140, height: 140,
        borderRadius: 70,
        borderWidth: 8,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'rgba(255,255,255,0.05)'
    },
    liquidFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    goalContent: {
        alignItems: 'center',
        zIndex: 10
    },
    goalLabel: {
        color: COLORS.slate[300],
        fontSize: 12,
        marginBottom: 4
    },
    goalValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff'
    },
    goalTarget: {
        fontSize: 14,
        color: COLORS.slate[400],
        fontWeight: 'normal'
    },
    startBtn: {
        backgroundColor: COLORS.white,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        ...SHADOWS.small
    },
    startBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.slate[900]
    },
    secondaryActions: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between'
    },
    secondaryBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center'
    },
    secondaryBtnText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600'
    },
    // Sections
    sectionContainer: {
        marginBottom: 25
    },
    sectionTitle: {
        fontSize: 16,
        color: COLORS.slate[500],
        marginBottom: 10,
        textAlign: 'center'
    },
    wotdCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        overflow: 'hidden',
        ...SHADOWS.small
    },
    statsCard: {
        backgroundColor: COLORS.slate[500], // Dark gray bg from sketch
        borderRadius: 16,
        padding: 20,
        ...SHADOWS.small
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8
    },
    statRowLabel: {
        color: COLORS.slate[200],
        fontSize: 14
    },
    statRowValue: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600'
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 4
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
        fontSize: 22, fontWeight: 'bold', marginBottom: 15,
        color: COLORS.slate[800]
    },
    modalBtn: {
        width: '100%', paddingVertical: 15, borderRadius: 12,
        alignItems: 'center', marginBottom: 10
    },
    modalBtnText: {
        color: '#fff', fontWeight: 'bold'
    },
    configOption: {
        width: '30%',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    configOptionActive: {
        // dynamic bg
        ...SHADOWS.small
    },
    configOptionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.slate[700]
    },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        backgroundColor: COLORS.slate[50],
        marginBottom: 10
    },
    langOptionActive: {
        backgroundColor: COLORS.slate[200],
        borderWidth: 1,
        borderColor: COLORS.primary
    },
    langText: {
        fontSize: 18,
        color: COLORS.slate[800]
    }
});
