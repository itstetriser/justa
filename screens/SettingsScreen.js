import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch, Linking, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { resetUserPoints } from '../lib/api';
import { getTranslation } from '../lib/translations'; // [NEW]

const SUPPORTED_LANGS = [
    { code: 'en', label: 'English', icon: '🇺🇸' },
    { code: 'tr', label: 'Türkçe', icon: '🇹🇷' },
    { code: 'ja', label: '日本語', icon: '🇯🇵' },
    { code: 'ko', label: '한국어', icon: '🇰🇷' },
    { code: 'es', label: 'Español', icon: '🇪🇸' },
    { code: 'fr', label: 'Français', icon: '🇫🇷' },
    { code: 'pt', label: 'Português', icon: '🇵🇹' },
];

export default function SettingsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [appLang, setAppLang] = useState('en');
    const [contentLang, setContentLang] = useState('es'); // Default per design
    const [version, setVersion] = useState("2.4.0 (Build 1042)");

    const t = (key) => getTranslation(appLang, key); // [NEW]

    // Feature toggles


    useFocusEffect(
        useCallback(() => {
            fetchSettings();
        }, [])
    );

    const fetchSettings = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (data) {
                setProfile(data);
                setAppLang(data.app_lang || 'en');
                setContentLang(data.native_lang || 'es');
            }
        } catch (err) { console.log(err); }
        finally { setLoading(false); }
    };

    // ... saveSetting, signOut, renderOption ... (keep existing)

    const saveSetting = async (key, val) => {
        if (key === 'app_lang') setAppLang(val);
        if (key === 'native_lang') setContentLang(val);
        // Sync
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await supabase.from('profiles').update({ [key]: val }).eq('id', session.user.id);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const handleResetProgress = () => {
        Alert.alert(
            t('resetProgress'),
            t('areYouSureReset'),
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await resetUserPoints(profile.id);
                            await fetchSettings();
                            Alert.alert(t('success'), "Progress reset.");
                        } catch (e) { Alert.alert(t('error'), "Failed to reset."); }
                        finally { setLoading(false); }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('deleteAccount'),
            t('deleteAccountDesc'),
            [
                { text: t('cancel'), style: "cancel" },
                { text: t('deleteForever'), style: "destructive", onPress: () => Alert.alert(t('contactSupport'), t('contactSupportMsg')) }
            ]
        );
    };

    const openLink = (url) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const shareApp = async () => {
        try {
            await Share.share({
                message: t('shareMsg'),
            });
        } catch (error) {
            console.log(error.message);
        }
    };

    const renderOption = (lang, current, type) => {
        const isSelected = lang.code === current;
        return (
            <TouchableOpacity
                key={lang.code}
                style={[
                    styles.optionCard,
                    isSelected && styles.optionSelected
                ]}
                onPress={() => saveSetting(type, lang.code)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.flagPlaceholder}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{lang.icon ? lang.icon : 'FL'}</Text>
                    </View>
                    <Text style={[styles.optionLabel, isSelected && { color: COLORS.primary, fontWeight: 'bold' }]}>
                        {lang.label}
                    </Text>
                </View>
                {isSelected && (
                    <View style={styles.checkCircle}>
                        <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
        )
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color={COLORS.slate[900]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile')}</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Account Details Card */}
                {profile && (
                    <View style={styles.profileCard}>
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{profile.username?.charAt(0).toUpperCase() || 'U'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.profileName}>{profile.username || 'User'}</Text>
                                <Text style={styles.profileLevel}>Level {profile.current_level} • {profile.total_points} pts</Text>
                            </View>
                            {profile.is_premium && <View style={styles.premiumBadge}><Text style={styles.premiumText}>PRO</Text></View>}
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>{t('streak')}</Text>
                                <Text style={styles.statValue}>{profile.streak_count} 🔥</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>{t('dailyGoal')}</Text>
                                <Text style={styles.statValue}>{profile.daily_goal} pts</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>{t('weekly')}</Text>
                                <Text style={styles.statValue}>{profile.score_weekly}</Text>
                            </View>
                        </View>
                    </View>
                )}



                {/* 2. App Interface (Language) */}
                <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                    <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                        <Text style={{ color: '#4A90E2' }}>📱</Text>
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>{t('appInterface')}</Text>
                        <Text style={styles.sectionDesc}>{t('appInterfaceDesc')}</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    {SUPPORTED_LANGS.map(l => renderOption(l, appLang, 'app_lang'))}
                </View>

                {/* 3. Content Language */}
                <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                    <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={{ color: '#2E7D32' }}>📖</Text>
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>{t('contentLanguage')}</Text>
                        <Text style={styles.sectionDesc}>{t('contentLanguageDesc')}</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    {SUPPORTED_LANGS.map(l => renderOption(l, contentLang, 'native_lang'))}
                </View>

                {/* 4. Support & Social */}
                <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                    <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
                        <Text style={{ color: '#EA580C' }}>🤝</Text>
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>{t('supportCommunity')}</Text>
                    </View>
                </View>
                <View style={styles.listContainer}>
                    <TouchableOpacity style={styles.listItem} onPress={shareApp}>
                        <Text style={styles.listItemText}>{t('shareApp')}</Text>
                        <Text style={{ color: COLORS.slate[400] }}>→</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.listItem} onPress={() => openLink('https://fillt.app/privacy')}>
                        <Text style={styles.listItemText}>{t('privacyPolicy')}</Text>
                        <Text style={{ color: COLORS.slate[400] }}>→</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.listItem} onPress={() => openLink('mailto:support@fillt.app')}>
                        <Text style={styles.listItemText}>{t('contactSupport')}</Text>
                        <Text style={{ color: COLORS.slate[400] }}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* 5. Account Actions */}
                <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                    <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={{ color: '#DC2626' }}>⚙️</Text>
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>{t('account')}</Text>
                    </View>
                </View>
                <View style={styles.listContainer}>
                    <TouchableOpacity style={styles.listItem} onPress={handleResetProgress}>
                        <Text style={[styles.listItemText, { color: '#DC2626' }]}>{t('resetProgress')}</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.listItem} onPress={handleDeleteAccount}>
                        <Text style={[styles.listItemText, { color: '#DC2626' }]}>{t('deleteAccount')}</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.listItem} onPress={signOut}>
                        <Text style={[styles.listItemText, { color: '#DC2626', fontWeight: 'bold' }]}>{t('signOut')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, minHeight: 50 }} />

                <Text style={styles.versionText}>Version {version}</Text>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    scrollContent: { padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20, backgroundColor: '#F5F7FA' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },

    // Profile Card
    profileCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 30,
        ...SHADOWS.medium
    },
    profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarPlaceholder: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.slate[200],
        justifyContent: 'center', alignItems: 'center', marginRight: 15
    },
    avatarText: { fontSize: 24, fontWeight: 'bold', color: COLORS.slate[600] },
    profileName: { fontSize: 20, fontWeight: 'bold', color: COLORS.slate[800] },
    profileLevel: { fontSize: 14, color: COLORS.slate[500] },
    premiumBadge: {
        backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12
    },
    premiumText: { fontSize: 10, fontWeight: 'bold', color: '#854D0E' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 15 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statItem: { alignItems: 'center' },
    statLabel: { fontSize: 12, color: COLORS.slate[400], marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.slate[700] },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    sectionDesc: { fontSize: 13, color: '#6B7280' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    optionCard: {
        width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 15,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 2, borderColor: 'transparent',
        ...SHADOWS.small
    },
    optionSelected: { borderColor: COLORS.primary, backgroundColor: '#F5F9FF' },

    flagPlaceholder: { width: 24, height: 24, backgroundColor: '#f0f0f0', borderRadius: 4, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    optionLabel: { fontSize: 15, color: '#374151' },

    checkCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

    signOutBtn: {
        backgroundColor: '#FFEBEE', borderRadius: 15, paddingVertical: 18,
        alignItems: 'center', marginBottom: 20
    },
    versionText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginBottom: 30 },

    // List Items
    listContainer: {
        backgroundColor: '#fff', borderRadius: 16, padding: 10, ...SHADOWS.small
    },
    listItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 15, paddingHorizontal: 10
    },
    listItemText: {
        fontSize: 16, color: COLORS.slate[800], fontWeight: '500'
    }
});
