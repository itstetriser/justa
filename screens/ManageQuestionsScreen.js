import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { useFocusEffect } from '@react-navigation/native';

export default function ManageQuestionsScreen({ navigation }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchQuestions();
        }, [])
    );

    async function fetchQuestions() {
        setLoading(true);
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('level', { ascending: true }); // Group by level intuitively

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            // Sort custom: easy, medium, hard
            const sortOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
            const sorted = data.sort((a, b) => sortOrder[a.level] - sortOrder[b.level]);
            setQuestions(sorted);
        }
        setLoading(false);
    }

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.badge, styles[`badge_${item.level}`]]}>
                    <Text style={styles.badgeText}>{item.level}</Text>
                </View>
                <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <Text style={styles.sentence}>{item.sentence_en}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Questions</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('BulkAdd')}
                    >
                        <Text style={[styles.addBtnText, { fontSize: 14, marginTop: 0 }]}>CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('AddQuestion')}
                    >
                        <Text style={styles.addBtnText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={questions}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No questions found.</Text>
                    }
                />
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: LAYOUT.padding,
        marginBottom: 20,
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
    addBtn: {
        backgroundColor: COLORS.primary,
        width: 35,
        height: 35,
        borderRadius: 17.5,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    addBtnText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: -2,
    },
    listContent: {
        paddingHorizontal: LAYOUT.padding,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: LAYOUT.radius,
        padding: 15,
        marginBottom: 15,
        ...SHADOWS.small,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 15,
    },
    badge_easy: { backgroundColor: COLORS.levels.easy },
    badge_medium: { backgroundColor: COLORS.levels.medium },
    badge_hard: { backgroundColor: COLORS.levels.hard },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    categoryText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
    },
    sentence: {
        color: COLORS.textPrimary,
        fontSize: 16,
        lineHeight: 24,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginTop: 50,
        fontSize: 16,
    },
});
