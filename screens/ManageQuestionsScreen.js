import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, Clipboard } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { useFocusEffect } from '@react-navigation/native';

export default function ManageQuestionsScreen({ navigation }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState('ALL');
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [wordStats, setWordStats] = useState([]);

    const LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'IELTS', 'TOEFL'];

    useFocusEffect(
        useCallback(() => {
            fetchQuestions();
        }, [selectedLevel])
    );

    async function fetchQuestions() {
        setLoading(true);
        // Alias the relation to avoid collision with 'words' JSON column if it exists
        let query = supabase.from('questions').select('*, linked_words:words(*)');

        if (selectedLevel !== 'ALL') {
            query = query.eq('level', selectedLevel);
        } else {
            query = query.order('level', { ascending: true });
        }

        const { data, error } = await query;

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            // Sort custom: A1-C2 if mixed
            const sortOrder = {
                'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6,
                'easy': 0, 'medium': 0, 'hard': 0 // Fallback
            };
            const sorted = data.sort((a, b) => (sortOrder[a.level] || 99) - (sortOrder[b.level] || 99));
            setQuestions(sorted);
        }
        setLoading(false);
    }

    const calculateWordStats = () => {
        const stats = {};

        questions.forEach(q => {
            // 1. Try Related Table Data first
            if (q.linked_words && Array.isArray(q.linked_words) && q.linked_words.length > 0) {
                q.linked_words.forEach(w => {
                    const txt = w.word_text?.toLowerCase().trim();
                    if (txt) stats[txt] = (stats[txt] || 0) + 1;
                });
            }
            // 2. Fallback to 'words' column (JSON or Array)
            else if (q.words) {
                let pool = q.words;
                if (typeof pool === 'string') {
                    try { pool = JSON.parse(pool); } catch (e) { }
                }
                if (Array.isArray(pool)) {
                    pool.forEach(w => {
                        // support both 'word_text' (new) and 'word' (legacy json)
                        const txt = (w.word_text || w.word)?.toLowerCase().trim();
                        if (txt) stats[txt] = (stats[txt] || 0) + 1;
                    });
                }
            }
            // 3. Fallback to 'word_pool' column (Legacy)
            else if (q.word_pool) {
                let pool = q.word_pool;
                if (typeof pool === 'string') {
                    try { pool = JSON.parse(pool); } catch (e) { }
                }
                if (Array.isArray(pool)) {
                    pool.forEach(w => {
                        const txt = (w.word_text || w.word)?.toLowerCase().trim();
                        if (txt) stats[txt] = (stats[txt] || 0) + 1;
                    });
                }
            }
        });

        // Convert to array and sort
        const sortedStats = Object.entries(stats)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count);

        setWordStats(sortedStats);
        setShowStatsModal(true);
    };

    const copyStatsToClipboard = () => {
        const csvContent = "Word,Count\n" + wordStats.map(w => `${w.word},${w.count}`).join('\n');
        Clipboard.setString(csvContent);
        Alert.alert('Success', 'Word usage stats copied to clipboard!');
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            // Navigate to Edit (Assuming AddQuestionScreen can handle edit)
            onPress={() => navigation.navigate('AddQuestion', { questionId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: COLORS.levels[item.level] || COLORS.primary }]}>
                    <Text style={styles.badgeText}>{item.level}</Text>
                </View>
                <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <Text style={styles.sentence}>{item.sentence_en}</Text>
        </TouchableOpacity>
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

            {/* 1. Level Filter */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {LEVELS.map(lvl => (
                        <TouchableOpacity
                            key={lvl}
                            style={[
                                styles.filterChip,
                                selectedLevel === lvl && styles.filterChipActive,
                                selectedLevel === lvl && lvl !== 'ALL' && { backgroundColor: COLORS.levels[lvl] }
                            ]}
                            onPress={() => setSelectedLevel(lvl)}
                        >
                            <Text style={[
                                styles.filterText,
                                selectedLevel === lvl && styles.filterTextActive
                            ]}>{lvl}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* 2. Stats Action */}
            <TouchableOpacity style={styles.statsBtn} onPress={calculateWordStats}>
                <Text style={styles.statsBtnText}>📊 Analyze Words in {selectedLevel}</Text>
            </TouchableOpacity>

            {/* 3. Stats Modal */}
            <Modal
                animationType="slide"
                visible={showStatsModal}
                onRequestClose={() => setShowStatsModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Word Usage ({selectedLevel})</Text>
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity onPress={copyStatsToClipboard}>
                                <Text style={[styles.closeText, { color: COLORS.secondary }]}>Copy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <FlatList
                        data={wordStats}
                        keyExtractor={item => item.word}
                        renderItem={({ item }) => (
                            <View style={styles.statRow}>
                                <Text style={styles.statWord}>{item.word}</Text>
                                <View style={styles.statCountBadge}>
                                    <Text style={styles.statCount}>{item.count}</Text>
                                </View>
                            </View>
                        )}
                        contentContainerStyle={{ padding: 20 }}
                    />
                </View>
            </Modal>

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
    // New Styles
    filterContainer: {
        paddingHorizontal: LAYOUT.padding,
        marginBottom: 15,
        height: 50,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        marginRight: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 36,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: 'transparent',
    },
    filterText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#fff',
    },
    statsBtn: {
        marginHorizontal: LAYOUT.padding,
        marginBottom: 15,
        padding: 12,
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        alignItems: 'center',
    },
    statsBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: 50,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    closeText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    statWord: {
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    statCountBadge: {
        backgroundColor: '#E5F2FF',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statCount: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
});
