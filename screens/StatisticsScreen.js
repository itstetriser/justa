import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard, fetchMyStats, fetchUserProfile, fetchDetailedStats } from '../lib/api';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { getTranslation } from '../lib/translations';

export default function StatisticsScreen({ navigation }) {
    const [viewMode, setViewMode] = useState('mine'); // 'mine' | 'leaderboard'
    const [timeframe, setTimeframe] = useState('daily'); // daily | weekly | monthly
    const [userId, setUserId] = useState(null);

    // Get Auth ID
    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });
    }, []);

    // Query: Profile (for Lang & Basic Stats)
    const { data: profile, refetch: profileRefetch } = useQuery({
        queryKey: ['profile', userId],
        queryFn: () => fetchUserProfile(userId),
        enabled: !!userId,
    });
    const t = (key) => getTranslation(profile?.app_lang || 'en', key);

    // Query: Detailed Stats
    const { data: detailedStats, isLoading: loadingDetailed, refetch: detailedStatsRefetch } = useQuery({
        queryKey: ['detailedStats', userId],
        queryFn: () => fetchDetailedStats(userId),
        enabled: !!userId && viewMode === 'mine',
    });

    // Query: Leaderboard
    const {
        data: leaderboard,
        isLoading: loadingLeaderboard,
        refetch: leaderboardRefetch
    } = useQuery({
        queryKey: ['leaderboard', timeframe],
        queryFn: () => fetchLeaderboard(timeframe),
        enabled: viewMode === 'leaderboard',
    });

    // Query: My Rank Stats (for Leaderboard View context)
    const {
        data: myRankStats,
        refetch: myRankRefetch
    } = useQuery({
        queryKey: ['myStats', userId, timeframe],
        queryFn: () => fetchMyStats(userId, timeframe),
        enabled: !!userId && viewMode === 'leaderboard',
    });

    // Refetch on Focus
    useFocusEffect(
        useCallback(() => {
            if (userId) {
                // Refetch all active queries
                if (viewMode === 'mine') detailedStatsRefetch();
                if (viewMode === 'leaderboard') {
                    leaderboardRefetch();
                    myRankRefetch();
                }
                // Always refetch profile for daily score updates
                profileRefetch();
            }
        }, [userId, viewMode, timeframe])
    );

    const loading = (viewMode === 'mine' && loadingDetailed) || (viewMode === 'leaderboard' && loadingLeaderboard);

    // --- RENDERERS ---

    const renderLeaderItem = ({ item, index }) => {
        const isMe = userId === item.id;
        const score = item[`score_${timeframe}`];

        let rankEmoji = '🏅';
        if (index === 0) rankEmoji = '🥇';
        if (index === 1) rankEmoji = '🥈';
        if (index === 2) rankEmoji = '🥉';

        return (
            <View style={[styles.leaderCard, isMe && styles.leaderCardMe]}>
                <View style={styles.rankContainer}>
                    <Text style={styles.rankEmoji}>{index < 3 ? rankEmoji : `#${index + 1}`}</Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={[styles.username, isMe && styles.textMe]}>
                        {item.username || t('anonymous')} {isMe && t('you')}
                    </Text>
                </View>

                {/* Streak Display */}
                <View style={{ alignItems: 'flex-end', marginRight: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.error }}>
                        🔥 {item.streak_count || 0}
                    </Text>
                </View>

                <View style={styles.scoreContainer}>
                    <Text style={[styles.scoreText, isMe && styles.textMe]}>{score}</Text>
                    <Text style={[styles.scoreLabel, isMe && styles.textMe]}>pts</Text>
                </View>
            </View>
        );
    };

    const renderMyStats = () => {
        const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown';
        const levelBreakdown = detailedStats?.level_breakdown || {};

        return (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* User Header */}
                <View style={styles.meHeader}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={{ fontSize: 24 }}>👤</Text>
                    </View>
                    <View>
                        <Text style={styles.meUsername}>{profile?.username || 'User'}</Text>
                        <Text style={styles.meDate}>{t('memberSince').replace('{date}', joinedDate)}</Text>
                    </View>
                </View>

                {/* Premium Banner */}
                {!profile?.is_premium ? (
                    <TouchableOpacity style={styles.premiumBanner} onPress={() => Alert.alert('Premium', 'Go Premium logic here')}>
                        <View>
                            <Text style={styles.premiumTitle}>{t('goPremiumTitle')}</Text>
                            <Text style={styles.premiumDesc}>{t('premiumPromo')}</Text>
                        </View>
                        <View style={styles.premiumBtn}>
                            <Text style={styles.premiumBtnText}>{t('upgrade')}</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={[styles.premiumBanner, { backgroundColor: '#FFD70033', borderColor: '#FFD700' }]}>
                        <Text style={[styles.premiumTitle, { color: '#B8860B' }]}>{t('premiumMember')}</Text>
                    </View>
                )}

                {/* Score & Streak Grid */}
                <View style={styles.grid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>🔥 {t('currentStreak')}</Text>
                        <Text style={styles.statValue}>{profile?.streak_count || 0}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>🏆 {t('bestStreak')}</Text>
                        <Text style={styles.statValue}>{profile?.best_streak || 0}</Text>
                    </View>
                </View>

                <View style={styles.grid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>📚 {t('questionsSeen')}</Text>
                        <Text style={styles.statValue}>{detailedStats?.questions_seen_total || 0}</Text>
                        <Text style={styles.statSub}>{detailedStats?.questions_correct_total || 0} {t('correct')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>📖 {t('wordsSeen')}</Text>
                        <Text style={styles.statValue}>{detailedStats?.words_seen_total || 0}</Text>
                    </View>
                </View>

                {/* Level Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('progressByLevel')}</Text>
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                        <View key={lvl} style={styles.levelRow}>
                            <Text style={styles.levelLabel}>{lvl}</Text>
                            <View style={styles.levelBarBg}>
                                {/* Show relative progress if possible, for now just a small visual logic */}
                                <View style={[styles.levelBarFill, { width: Math.min(((levelBreakdown[lvl] || 0) * 2), 100) + '%' }]} />
                            </View>
                            <Text style={styles.levelValue}>{levelBreakdown[lvl] || 0} Qs</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

    // Tabs Component
    const TabButton = ({ id, label }) => (
        <TouchableOpacity
            style={[styles.tab, timeframe === id && styles.activeTab]}
            onPress={() => setTimeframe(id)}
        >
            <Text style={[styles.tabText, timeframe === id && styles.activeTabText]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header Toggle */}
            <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10, marginRight: 10 }}>
                    <Feather name="arrow-left" size={24} color={COLORS.slate[900]} />
                </TouchableOpacity>
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'mine' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('mine')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'mine' && styles.toggleTextActive]}>{t('stats')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'leaderboard' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('leaderboard')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'leaderboard' && styles.toggleTextActive]}>{t('leaderboard')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <>
                    {viewMode === 'mine' ? (
                        renderMyStats()
                    ) : (
                        <View style={{ flex: 1 }}>
                            {/* Timeframe Tabs (Only for Leaderboard) */}
                            <View style={styles.tabsContainer}>
                                <TabButton id="daily" label={t('daily')} />
                                <TabButton id="weekly" label={t('weekly')} />
                                <TabButton id="monthly" label={t('monthly')} />
                            </View>

                            {/* My Rank Context */}
                            {myRankStats && (
                                <View style={styles.myRankContext}>
                                    <Text style={styles.contextText}>
                                        {t('yourScore').replace('{timeframe}', t(timeframe))}: <Text style={{ fontWeight: 'bold' }}>{myRankStats[`score_${timeframe}`]}</Text>
                                    </Text>
                                </View>
                            )}

                            <FlatList
                                data={leaderboard || []}
                                keyExtractor={(item) => item.id}
                                renderItem={renderLeaderItem}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={<Text style={styles.emptyText}>{t('noStats')}</Text>}
                            />
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: 50,
    },
    header: {
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: LAYOUT.padding,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 4,
        ...SHADOWS.small,
        width: '100%',
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    toggleBtnActive: {
        backgroundColor: COLORS.primary,
    },
    toggleText: {
        color: COLORS.textSecondary,
        fontWeight: 'bold',
    },
    toggleTextActive: {
        color: '#fff',
    },

    // My Stats Styles
    scrollContent: {
        paddingHorizontal: LAYOUT.padding,
        paddingBottom: 40,
    },
    meHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    meUsername: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    meDate: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    premiumBanner: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 15,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        ...SHADOWS.small,
    },
    premiumTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    premiumDesc: {
        fontSize: 12,
        color: '#E3F2FD',
    },
    premiumBtn: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    premiumBtnText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        padding: 15,
        borderRadius: 12,
        ...SHADOWS.small,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    statSub: {
        fontSize: 12,
        color: COLORS.success,
        marginTop: 4,
    },
    section: {
        marginTop: 10,
        backgroundColor: COLORS.surface,
        padding: 15,
        borderRadius: 12,
        ...SHADOWS.small,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 15,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelLabel: {
        width: 60,
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
    },
    levelBarBg: {
        flex: 1,
        height: 8,
        backgroundColor: '#eee',
        borderRadius: 4,
        marginHorizontal: 10,
        overflow: 'hidden',
    },
    levelBarFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    levelValue: {
        width: 50,
        textAlign: 'right',
        fontSize: 12,
        color: COLORS.textPrimary,
    },

    // Leaderboard Styles (Recycled/Tweaked)
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: LAYOUT.padding,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 4,
        marginBottom: 10,
        ...SHADOWS.small,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        paddingHorizontal: LAYOUT.padding,
        paddingBottom: 40,
    },
    leaderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        ...SHADOWS.small,
    },
    leaderCardMe: {
        borderWidth: 2,
        borderColor: COLORS.primary,
        backgroundColor: '#F0F9FF',
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
    },
    rankEmoji: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    userInfo: {
        flex: 1,
        paddingHorizontal: 15,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    scoreContainer: {
        alignItems: 'flex-end',
    },
    scoreText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    scoreLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
    },
    textMe: {
        color: COLORS.primary,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginTop: 20,
    },
    myRankContext: {
        marginHorizontal: LAYOUT.padding,
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    contextText: {
        color: COLORS.primary,
        textAlign: 'center',
    }
});
