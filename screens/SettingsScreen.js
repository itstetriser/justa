import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

const SUPPORTED_LANGS = [
    { code: 'en', label: '🇬🇧 English' },
    { code: 'tr', label: '🇹🇷 Türkçe' },
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'de', label: '🇩🇪 Deutsch' },
    { code: 'jp', label: '🇯🇵 日本語' },
    { code: 'pt', label: '🇵🇹 Português' },
    { code: 'cn', label: '🇨🇳 中文' },
    { code: 'ar', label: '🇸🇦 العربية' },
];

export default function SettingsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [appLang, setAppLang] = useState('en');
    const [contentLang, setContentLang] = useState('tr');

    useFocusEffect(
        useCallback(() => {
            fetchSettings();
        }, [])
    );

    const fetchSettings = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('app_lang, native_lang')
                .eq('id', session.user.id)
                .single();

            if (data) {
                setAppLang(data.app_lang || 'en');
                setContentLang(data.native_lang || 'tr');
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const saveSetting = async (key, val) => {
        try {
            if (key === 'app_lang') setAppLang(val);
            if (key === 'native_lang') setContentLang(val);

            const { data: { session } } = await supabase.auth.getSession();
            await supabase
                .from('profiles')
                .update({ [key]: val })
                .eq('id', session.user.id);

        } catch (error) {
            Alert.alert('Error', 'Failed to save setting');
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const renderLangOption = (lang, currentVal, key) => {
        const isSelected = lang.code === currentVal;
        return (
            <TouchableOpacity
                key={lang.code}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => saveSetting(key, lang.code)}
            >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {lang.label}
                </Text>
                {isSelected && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Section 1: UI Language */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📱 App Interface Language</Text>
                    <Text style={styles.sectionDesc}>Buttons, headers, and menus.</Text>
                    <View style={styles.optionsList}>
                        {SUPPORTED_LANGS.map(l => renderLangOption(l, appLang, 'app_lang'))}
                    </View>
                </View>

                {/* Section 2: Content Language */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📚 Content & Explanations</Text>
                    <Text style={styles.sectionDesc}>Language for word meanings and error feedback.</Text>
                    <View style={styles.optionsList}>
                        {SUPPORTED_LANGS.map(l => renderLangOption(l, contentLang, 'native_lang'))}
                    </View>
                </View>

                <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: 50,
    },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: LAYOUT.padding,
        marginBottom: 20,
    },
    backBtn: { padding: 5 },
    backText: { color: COLORS.textSecondary, fontSize: 16 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    content: {
        paddingHorizontal: LAYOUT.padding,
        paddingBottom: 50,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 5,
    },
    sectionDesc: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 15,
    },
    optionsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    option: {
        width: '48%',
        backgroundColor: COLORS.surface,
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
        ...SHADOWS.small,
    },
    optionSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10', // Light tint
    },
    optionText: {
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    optionTextSelected: {
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    check: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    signOutBtn: {
        backgroundColor: '#FFE5E5',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    signOutText: {
        color: COLORS.error,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
