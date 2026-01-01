import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { supabase } from '../lib/supabase';

export default function AdminScreen({ navigation }) {

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin Panel</Text>
                <View style={{ width: 40 }} /> {/* Spacer */}
            </View>

            <View style={styles.content}>
                <Text style={styles.welcomeText}>Welcome, Admin!</Text>
                <Text style={styles.subtitle}>Manage your application content here.</Text>

                <View style={styles.grid}>
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => navigation.navigate('ManageQuestions')}
                    >
                        <Text style={styles.cardIcon}>📝</Text>
                        <Text style={styles.cardTitle}>Manage Questions</Text>
                        <Text style={styles.cardDesc}>Add, edit, or delete game questions.</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card}>
                        <Text style={styles.cardIcon}>👥</Text>
                        <Text style={styles.cardTitle}>Users</Text>
                        <Text style={styles.cardDesc}>View user statistics.</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: 50,
        paddingHorizontal: LAYOUT.padding,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    backBtn: {
        padding: 5,
    },
    backText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    content: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 30,
    },
    grid: {
        gap: 20,
    },
    card: {
        backgroundColor: COLORS.surface,
        padding: 25,
        borderRadius: LAYOUT.radius,
        ...SHADOWS.medium,
        alignItems: 'center',
    },
    cardIcon: {
        fontSize: 40,
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 5,
    },
    cardDesc: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});
