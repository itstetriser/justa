
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

const SUPPORTED_LANGS = [
    { code: 'en', label: 'English', icon: '1F 1E' }, // Simplified icon logic
    { code: 'tr', label: 'Türkçe', icon: '1F 1F' },
    { code: 'es', label: 'Español', icon: '1F 1E' },
    { code: 'fr', label: 'Français', icon: '1F 1F' },
    { code: 'de', label: 'Deutsch', icon: '' },
    { code: 'it', label: 'Italiano', icon: '' },
];

export default function SettingsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [appLang, setAppLang] = useState('en');
    const [contentLang, setContentLang] = useState('es'); // Default per design
    const [version, setVersion] = useState("2.4.0 (Build 1042)");

    useFocusEffect(
        useCallback(() => {
            fetchSettings();
        }, [])
    );

    const fetchSettings = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data } = await supabase.from('profiles').select('app_lang, native_lang').eq('id', session.user.id).single();
            if (data) {
                setAppLang(data.app_lang || 'en');
                setContentLang(data.native_lang || 'es');
            }
        } catch (err) { console.log(err); }
        finally { setLoading(false); }
    };

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
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>1F</Text>
                        {/* Placeholder for flag glyph */}
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
                    <Text style={{ fontSize: 20 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Section 1 */}
                <View style={styles.sectionHeader}>
                    <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                        <Text style={{ color: '#4A90E2' }}>📱</Text>
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>App Interface</Text>
                        <Text style={styles.sectionDesc}>Language for buttons & menus</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    {SUPPORTED_LANGS.slice(0, 4).map(l => renderOption(l, appLang, 'app_lang'))}
                </View>

                {/* Section 2 */}
                <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                    <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={{ color: '#2E7D32' }}>📖</Text>
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>Content & Explanations</Text>
                        <Text style={styles.sectionDesc}>Language for definitions & errors</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    {SUPPORTED_LANGS.slice(0, 4).map(l => renderOption(l, contentLang, 'native_lang'))}
                    {/* Add a few more just to match design shape */}
                </View>

                <View style={{ flex: 1, minHeight: 50 }} />

                <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                    <Text style={{ fontSize: 16, color: '#E53935' }}>
                        →  <Text style={{ fontWeight: 'bold' }}>Sign Out</Text>
                    </Text>
                </TouchableOpacity>

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

    flagPlaceholder: { width: 24, height: 24, backgroundColor: '#000', borderRadius: 4, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    optionLabel: { fontSize: 15, color: '#374151' },

    checkCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

    signOutBtn: {
        backgroundColor: '#FFEBEE', borderRadius: 15, paddingVertical: 18,
        alignItems: 'center', marginBottom: 20
    },
    versionText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginBottom: 30 }
});
