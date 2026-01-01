import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, updateDailyGoal } from '../lib/api';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { getTranslation } from '../lib/translations';

export default function HomeScreen({ navigation }) {
    // Auth State (still needed for ID)
    const [userId, setUserId] = useState(null);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [tempGoal, setTempGoal] = useState('100');

    const queryClient = useQueryClient();

    // 1. Get User ID separately (Auth is fast/local usually)
    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) setUserId(session.user.id);
        });
    }, []);

    // 2. React Query Hook
    const {
        data: profile,
        isLoading,
        refetch,
        isRefetching
    } = useQuery({
        queryKey: ['profile', userId],
        queryFn: () => fetchUserProfile(userId),
        enabled: !!userId, // Only run if we have a user ID
    });

    // 3. Re-fetch when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (userId) {
                refetch();
            }
        }, [userId, refetch])
    );

    // Mutation for updating goal
    const mutation = useMutation({
        mutationFn: (newGoal) => updateDailyGoal(userId, newGoal),
        onSuccess: () => {
            queryClient.invalidateQueries(['profile', userId]);
            setShowGoalModal(false);
            Alert.alert("Success", "Daily goal updated!");
        },
        onError: (err) => {
            Alert.alert("Error", err.message);
        }
    });

    const handleSaveGoal = () => {
        const val = parseInt(tempGoal);
        if (isNaN(val) || val <= 0) {
            Alert.alert("Invalid Goal", "Please enter a positive number.");
            return;
        }
        mutation.mutate(val);
    };

    const openGoalModal = () => {
        setTempGoal((profile?.daily_goal || 100).toString());
        setShowGoalModal(true);
    };

    // Derived State
    const appLang = profile?.app_lang || 'en';
    const contentLang = profile?.native_lang || 'tr';
    const dailyGoal = profile?.daily_goal || 100;
    const t = (key) => getTranslation(appLang, key);

    const onRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const navigateToGame = (level) => {
        navigation.navigate('Game', {
            level,
            appLang,
            userLang: contentLang,
            isPremium: profile?.is_premium || false
        });
    };

    if (isLoading && !profile) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Helper for Level Cards
    const LevelCard = ({ level, color, icon }) => (
        <TouchableOpacity
            style={[styles.levelCard, { borderLeftColor: color }]}
            onPress={() => navigateToGame(level)}
        >
            <View style={[styles.levelIconContainer, { backgroundColor: color + '20' }]}>
                <Text style={styles.levelIcon}>{icon}</Text>
            </View>
            <View style={styles.levelInfo}>
                <Text style={[styles.levelTitle, { color: color }]}>{t(level)}</Text>
                <Text style={styles.levelSubtitle}>Master the basics</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                {/* Settings Button */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <Text style={{ fontSize: 24 }}>⚙️</Text>
                </TouchableOpacity>
            </View>

            {/* Admin Button */}
            {profile?.is_admin && (
                <TouchableOpacity
                    style={styles.adminBanner}
                    onPress={() => navigation.navigate('Admin')}
                >
                    <Text style={styles.adminBannerText}>🔧 Admin Panel</Text>
                </TouchableOpacity>
            )}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <Text style={styles.greeting}>{t('welcome')},</Text>
                    <Text style={styles.username}>{profile?.username || 'User'}!</Text>
                </View>

                {/* Daily Goal Progress */}
                <View style={styles.goalCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.goalTitle}>Daily Goal</Text>
                            <TouchableOpacity onPress={openGoalModal} style={styles.editGoalBtn}>
                                <Text style={styles.editGoalText}>✏️</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.goalText}>
                            {Math.min(profile?.score_daily || 0, dailyGoal)} / {dailyGoal} pts
                        </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${Math.min(((profile?.score_daily || 0) / dailyGoal) * 100, 100)}%` }
                            ]}
                        />
                    </View>
                    {(profile?.score_daily || 0) >= dailyGoal && (
                        <Text style={styles.goalSuccess}>🎉 Goal Achieved!</Text>
                    )}
                </View>

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statEmoji}>🏆</Text>
                        <View>
                            <Text style={styles.statValue}>{profile?.score_daily || 0}</Text>
                            <Text style={styles.statLabel}>Daily Points</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Statistics')}>
                                <Text style={styles.statLink}>See statistics</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statEmoji}>🔥</Text>
                        <View>
                            <Text style={styles.statValue}>{profile?.streak_count || 0}</Text>
                            <Text style={styles.statLabel}>{t('streak')}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionHeader}>{t('selectLevel')}</Text>

                <View style={styles.levelList}>
                    <LevelCard level="easy" color={COLORS.levels.easy} icon="🌱" />
                    <LevelCard level="medium" color={COLORS.levels.medium} icon="🚀" />
                    <LevelCard level="hard" color={COLORS.levels.hard} icon="🧠" />
                </View>
            </ScrollView>

            {/* Set Goal Modal */}
            <Modal
                visible={showGoalModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGoalModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set Daily Goal</Text>
                        <Text style={styles.modalDesc}>How many points do you want to aim for each day?</Text>

                        <TextInput
                            style={styles.input}
                            value={tempGoal}
                            onChangeText={setTempGoal}
                            keyboardType="numeric"
                            placeholder="e.g. 100"
                        />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
                            <Text style={styles.saveBtnText}>Save Goal</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowGoalModal(false)} style={{ marginTop: 15 }}>
                            <Text style={styles.closeModalText}>Cancel</Text>
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
        paddingTop: 50,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: LAYOUT.padding,
        paddingBottom: 40,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: LAYOUT.padding,
        marginBottom: 20,
        zIndex: 10,
    },
    // ... existing styles ...
    actionBtn: {
        padding: 5
    },
    heroSection: {
        marginBottom: 25,
    },
    greeting: {
        fontSize: 18,
        color: COLORS.textSecondary,
    },
    username: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 35,
        gap: 15,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    statEmoji: {
        fontSize: 28,
        marginRight: 10,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 15,
    },
    levelList: {
        gap: 15,
    },
    levelCard: {
        backgroundColor: COLORS.surface,
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 6,
        ...SHADOWS.medium,
    },
    levelIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    levelIcon: {
        fontSize: 24,
    },
    levelInfo: {
        flex: 1,
    },
    levelTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    levelSubtitle: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    arrow: {
        fontSize: 24,
        color: COLORS.textLight,
        fontWeight: 'bold',
    },
    adminBanner: {
        marginHorizontal: LAYOUT.padding,
        marginBottom: 15,
        backgroundColor: COLORS.textPrimary,
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    adminBannerText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    statLink: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 5,
        textDecorationLine: 'underline',
    },
    goalCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
        ...SHADOWS.medium,
    },
    goalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    editGoalBtn: {
        marginLeft: 10,
    },
    editGoalText: {
        fontSize: 16,
    },
    goalText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: COLORS.background,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.success,
        borderRadius: 5,
    },
    goalSuccess: {
        marginTop: 10,
        textAlign: 'center',
        color: COLORS.success,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 25,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 10,
    },
    modalDesc: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        backgroundColor: COLORS.background,
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    saveBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    closeModalText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
        padding: 5,
    },
});
