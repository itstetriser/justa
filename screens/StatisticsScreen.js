import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard, fetchMyStats } from '../lib/api';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { getTranslation } from '../lib/translations';

export default function StatisticsScreen({ navigation }) {
    const [timeframe, setTimeframe] = useState('daily'); // daily | weekly | monthly
    const [userId, setUserId] = useState(null);

    // Get Auth ID
    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });
    }, []);

    // Query: Leaderboard
    const {
        data: leaderboard,
        isLoading: loadingLeaderboard
    } = useQuery({
        queryKey: ['leaderboard', timeframe],
        queryFn: () => fetchLeaderboard(timeframe),
    });

    // Query: My Stats
    const {
        data: myStats,
        isLoading: loadingMyStats
    } = useQuery({
        queryKey: ['myStats', userId, timeframe],
        queryFn: () => fetchMyStats(userId, timeframe),
        enabled: !!userId,
    });

    const loading = loadingLeaderboard || loadingMyStats;

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
                        {item.username || 'Anonymous'} {isMe && '(You)'}
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Leaderboard</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Timeframe Tabs */}
            <View style={styles.tabsContainer}>
                <TabButton id="daily" label="Daily" />
                <TabButton id="weekly" label="Weekly" />
                <TabButton id="monthly" label="Monthly" />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <>
                    {/* My Stats Banner */}
                    <View style={styles.myStatsCard}>
                        <View>
                            <Text style={styles.myStatsLabel}>YOUR {timeframe.toUpperCase()} SCORE</Text>
                            <Text style={styles.myStatsValue}>
                                {myStats ? myStats[`score_${timeframe}`] : 0}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.streakLabel}>STREAK</Text>
                            <Text style={styles.streakValue}>🔥 {myStats?.streak_count || 0}</Text>
                        </View>
                    </View>

                    {/* Leaderboard List */}
                    <FlatList
                        data={leaderboard || []}
                        keyExtractor={(item) => item.id}
                        renderItem={renderLeaderItem}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={<Text style={styles.listHeader}>Top 10 Players</Text>}
                        ListEmptyComponent={<Text style={styles.emptyText}>No stats yet.</Text>}
                    />
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: LAYOUT.padding,
        marginBottom: 20,
    },
    backText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: LAYOUT.padding,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
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
    myStatsCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface, // Or a highlight color
        marginHorizontal: LAYOUT.padding,
        padding: 20,
        borderRadius: 16,
        marginBottom: 25,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
        ...SHADOWS.medium,
    },
    myStatsLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    myStatsValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    streakLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    streakValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.error, // Fire color
    },
    listContent: {
        paddingHorizontal: LAYOUT.padding,
        paddingBottom: 40,
    },
    listHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 15,
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
});
