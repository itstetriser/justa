import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, updateDailyGoal, fetchCategories, updateUserLevel, resetUserPoints, updateUserLanguage } from '../lib/api';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { getTranslation } from '../lib/translations';
import WordOfTheDay from '../components/WordOfTheDay';

export default function HomeScreen({ navigation }) {
    // Auth State
    const [userId, setUserId] = useState(null);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [tempGoal, setTempGoal] = useState('100');

    // New State for Practice Flow
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Confirmation Modal State (ADDED)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingLevel, setPendingLevel] = useState(null);
    const [confirmType, setConfirmType] = useState(null); // 'UP' or 'DOWN'

    const queryClient = useQueryClient();

    const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'TOEFL', 'IELTS'];
    const LEVEL_COLORS = {
        'A1': COLORS.levels.A1, 'A2': COLORS.levels.A2,
        'B1': COLORS.levels.B1, 'B2': COLORS.levels.B2,
        'C1': COLORS.levels.C1, 'C2': COLORS.levels.C2,
        'TOEFL': '#444', 'IELTS': '#444'
    };

    // 1. Get User ID
    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) setUserId(session.user.id);
        });
    }, []);

    // 2. Query Profile
    const { data: profile, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['profile', userId],
        queryFn: () => fetchUserProfile(userId),
        enabled: !!userId,
    });

    // 3. Focus Effect
    useFocusEffect(
        useCallback(() => {
            if (userId) refetch();
        }, [userId, refetch])
    );

    // Derived State
    const currentLevel = (profile?.current_level || 'A1').toUpperCase();
    const currentLang = profile?.app_lang || 'en';

    // Language Constants & State
    const [showLangModal, setShowLangModal] = useState(false);
    const LANGUAGES = {
        'en': '🇬🇧', 'tr': '🇹🇷', 'es': '🇪🇸', 'de': '🇩🇪',
        'fr': '🇫🇷', 'it': '🇮🇹', 'jp': '🇯🇵', 'kr': '🇰🇷',
        'cn': '🇨🇳', 'ru': '🇷🇺', 'pt': '🇵🇹'
    };

    // Logic: Language Change
    const handleLangSelect = async (langCode) => {
        try {
            await updateUserLanguage(userId, langCode);
            queryClient.invalidateQueries(['profile', userId]);
            setShowLangModal(false);
            // Optionally reload app or just context
        } catch (e) {
            Alert.alert("Error", "Failed to update language");
        }
    };

    // Logic: Start Practice
    const handleBonusClaimed = () => {
        queryClient.invalidateQueries(['profile', userId]);
    };

    const handleStartPractice = () => {
        navigation.navigate('Game', {
            level: currentLevel,
            category: null, // No category filter
            appLang: profile?.app_lang,
            userLang: profile?.native_lang,
            isPremium: profile?.is_premium
        });
    };

    // Logic: Level Change Preparation
    const handleLevelSelect = (newLevel) => {
        const oldIndex = LEVELS.indexOf(currentLevel);
        const newIndex = LEVELS.indexOf(newLevel);

        if (newLevel === currentLevel) {
            setShowLevelModal(false);
            return;
        }

        // Map invalid level to 0 if needed
        const safeOldIndex = oldIndex === -1 ? 0 : oldIndex;

        setPendingLevel(newLevel);
        setShowLevelModal(false);

        if (newIndex > safeOldIndex) {
            setConfirmType('UP');
            setShowConfirmModal(true);
        } else {
            setConfirmType('DOWN');
            setShowConfirmModal(true);
        }
    };

    // Logic: Execute Change
    const confirmLevelChange = async () => {
        if (!pendingLevel) return;

        try {
            if (confirmType === 'DOWN') {
                await resetUserPoints(userId);
            }
            await updateUserLevel(userId, pendingLevel);
            queryClient.invalidateQueries(['profile', userId]);
            Alert.alert("Success", `Level updated to ${pendingLevel}`);
        } catch (e) {
            console.error("Level Update Error:", e);
            if (e.message?.includes("400") || e.status === 400) {
                Alert.alert("Configuration Error", "The database is missing the 'current_level' column.\n\nPlease run the 'add_level_column.sql' file in your Supabase SQL Editor.");
            } else {
                Alert.alert(t('error'), "Failed to update level. Check your internet connection.");
            }
        } finally {
            setShowConfirmModal(false);
            setPendingLevel(null);
        }
    };

    // Existing Goal Mutation
    const mutation = useMutation({
        mutationFn: (newGoal) => updateDailyGoal(userId, newGoal),
        onSuccess: () => {
            queryClient.invalidateQueries(['profile', userId]);
            setShowGoalModal(false);
            Alert.alert(t('success'), "Daily goal updated!");
        },
        onError: (err) => Alert.alert("Error", err.message)
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

    // Derived helpers
    const appLang = profile?.app_lang || 'en';
    const dailyGoal = profile?.daily_goal || 100;
    const t = (key) => getTranslation(appLang, key);

    const onRefresh = useCallback(() => refetch(), [refetch]);

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
            style={[styles.levelCard, { borderTopColor: color }]}
            onPress={() => navigateToGame(level)}
        >
            <View style={[styles.levelIconContainer, { backgroundColor: color + '20' }]}>
                <Text style={styles.levelIcon}>{icon}</Text>
            </View>
            <View style={styles.levelInfo}>
                <Text style={[styles.levelTitle, { color: color }]}>{t(level)}</Text>
                <Text style={styles.levelSubtitle}>Master the basics</Text>
            </View>

        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <View style={{ flex: 1 }} />
                {/* 3 Circles: Level | Flag | Settings */}
                <View style={{ flexDirection: 'row' }}>
                    {/* Level Circle */}
                    <TouchableOpacity
                        style={[styles.headerCircle, { borderColor: LEVEL_COLORS[currentLevel] || COLORS.primary, marginRight: 10 }]}
                        onPress={() => setShowLevelModal(true)}
                    >
                        <Text style={{ fontWeight: 'bold', color: LEVEL_COLORS[currentLevel] || COLORS.primary }}>
                            {currentLevel}
                        </Text>
                    </TouchableOpacity>

                    {/* Flag Circle */}
                    <TouchableOpacity
                        style={[styles.headerCircle, { marginRight: 10 }]}
                        onPress={() => setShowLangModal(true)}
                    >
                        <Text style={{ fontSize: 20 }}>{LANGUAGES[currentLang] || '🌍'}</Text>
                    </TouchableOpacity>

                    {/* Settings Circle */}
                    <TouchableOpacity
                        style={styles.headerCircle}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Text style={{ fontSize: 20 }}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Admin Button */}
            {profile?.is_admin && (
                <TouchableOpacity
                    style={styles.adminBanner}
                    onPress={() => navigation.navigate('Admin')}
                >
                    <Text style={styles.adminBannerText}>🔧 {t('adminPanel')}</Text>
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
                            <Text style={styles.goalTitle}>{t('dailyGoal')}</Text>
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
                        <Text style={styles.goalSuccess}>{t('goalAchieved')}</Text>
                    )}
                </View>

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statEmoji}>🏆</Text>
                        <View>
                            <Text style={styles.statValue}>{profile?.score_daily || 0}</Text>
                            <Text style={styles.statLabel}>{t('dailyPoints')}</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Statistics')}>
                                <Text style={styles.statLink}>{t('seeStats')}</Text>
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

                {/* WORD OF THE DAY */}
                <WordOfTheDay
                    userId={userId}
                    level={currentLevel || 'A1'}
                    dailyScore={profile?.score_daily || 0}
                    appLang={appLang}
                    onBonusClaimed={handleBonusClaimed}
                />

                <Text style={styles.sectionHeader}>{t('practice')}</Text>

                {/* Start Practice Button */}
                <TouchableOpacity style={styles.startBtn} onPress={handleStartPractice}>
                    <Text style={styles.startBtnText}>{t('startPractice')}</Text>
                </TouchableOpacity>



            </ScrollView>

            {/* Category Selection Modal */}
            <Modal
                visible={showCategoryModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('chooseCategory')}</Text>
                        {loadingCategories ? (
                            <ActivityIndicator color={COLORS.primary} />
                        ) : (
                            <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                                {categories.map((cat, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.categoryItem}
                                        onPress={() => handleCategorySelect(cat)}
                                    >
                                        <Text style={styles.categoryText}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                                {categories.length === 0 && <Text style={{ textAlign: 'center', color: '#999' }}>{t('noCategories')}</Text>}
                            </ScrollView>
                        )}
                        <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={{ marginTop: 15 }}>
                            <Text style={styles.closeModalText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Level Selection Modal */}
            <Modal
                visible={showLevelModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLevelModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('selectLevel')}</Text>
                        <Text style={styles.modalDesc}>{t('current')}: {currentLevel}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {LEVELS.map(l => (
                                <TouchableOpacity
                                    key={l}
                                    style={[
                                        styles.levelChip,
                                        currentLevel === l && styles.levelChipActive,
                                        { borderColor: LEVEL_COLORS[l] }
                                    ]}
                                    onPress={() => handleLevelSelect(l)}
                                >
                                    <Text style={[
                                        styles.levelChipText,
                                        currentLevel === l && { color: '#fff' },
                                        { color: currentLevel === l ? '#fff' : LEVEL_COLORS[l] }
                                    ]}>{l}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity onPress={() => setShowLevelModal(false)} style={{ marginTop: 20 }}>
                            <Text style={styles.closeModalText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {confirmType === 'UP' ? t('changeLevel') : t('warningReset')}
                        </Text>

                        <Text style={styles.modalDesc}>
                            {confirmType === 'UP'
                                ? t('levelUpDesc').replace('{level}', pendingLevel)
                                : t('levelDownDesc').replace('{level}', pendingLevel)
                            }
                        </Text>

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: confirmType === 'DOWN' ? COLORS.error : COLORS.primary }]}
                            onPress={confirmLevelChange}
                        >
                            <Text style={styles.saveBtnText}>
                                {confirmType === 'UP' ? t('confirmChange') : t('resetChange')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowConfirmModal(false)} style={{ marginTop: 15 }}>
                            <Text style={styles.closeModalText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Set Goal Modal */}
            <Modal
                visible={showGoalModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGoalModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('setDailyGoal')}</Text>
                        <Text style={styles.modalDesc}>{t('setGoalDesc')}</Text>

                        <TextInput
                            style={styles.input}
                            value={tempGoal}
                            onChangeText={setTempGoal}
                            keyboardType="numeric"
                            placeholder="e.g. 100"
                        />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
                            <Text style={styles.saveBtnText}>{t('saveGoal')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowGoalModal(false)} style={{ marginTop: 15 }}>
                            <Text style={styles.closeModalText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Language Selection Modal */}
            <Modal
                visible={showLangModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLangModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>
                        <Text style={styles.modalDesc}>{t('langChangeDesc')}</Text>

                        <View style={{ width: '100%', maxHeight: 400 }}>
                            <ScrollView>
                                {Object.entries(LANGUAGES).map(([code, flag]) => (
                                    <TouchableOpacity
                                        key={code}
                                        style={[styles.langChip, currentLang === code && { backgroundColor: COLORS.background }]}
                                        onPress={() => handleLangSelect(code)}
                                    >
                                        <Text style={styles.langFlag}>{flag}</Text>
                                        <Text style={styles.langText}>
                                            {
                                                {
                                                    'en': 'English',
                                                    'tr': 'Türkçe',
                                                    'es': 'Español',
                                                    'de': 'Deutsch',
                                                    'fr': 'Français',
                                                    'it': 'Italiano',
                                                    'jp': '日本語',
                                                    'kr': '한국어',
                                                    'cn': '中文',
                                                    'ru': 'Русский',
                                                    'pt': 'Português'
                                                }[code] || code.toUpperCase()
                                            }
                                        </Text>
                                        {currentLang === code && <Text style={{ marginLeft: 'auto', color: COLORS.primary }}>✓</Text>}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity onPress={() => setShowLangModal(false)} style={{ marginTop: 20 }}>
                            <Text style={styles.closeModalText}>{t('cancel')}</Text>
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
    levelChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: COLORS.surface,
        minWidth: 60,
        alignItems: 'center',
        margin: 5
    },
    levelChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    levelChipText: {
        fontWeight: 'bold'
    },
    startBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        marginVertical: 20,
        ...SHADOWS.medium,
    },
    startBtnText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5
    },
    headerCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.surface, // Default border
        ...SHADOWS.small
    },
    langChip: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
    },
    langFlag: {
        fontSize: 24,
        marginRight: 15
    },
    langText: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '600'
    },
    // Keep existing admin/stats styles
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

