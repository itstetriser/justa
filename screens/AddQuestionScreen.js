import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, BaseButton, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { supabase } from '../lib/supabase';

export default function AddQuestionScreen({ navigation }) {
    const [sentence, setSentence] = useState('');
    const [level, setLevel] = useState('easy');
    const [category, setCategory] = useState('');
    const [words, setWords] = useState([{ text: '', isCorrect: false, translation: '', explanation: '' }]);
    const [loading, setLoading] = useState(false);

    const Levels = ['easy', 'medium', 'hard'];

    const addWordField = () => {
        setWords([...words, { text: '', isCorrect: false, translation: '', explanation: '' }]);
    };

    const updateWord = (index, field, value) => {
        const newWords = [...words];
        newWords[index][field] = value;
        setWords(newWords);
    };

    const removeWord = (index) => {
        const newWords = words.filter((_, i) => i !== index);
        setWords(newWords);
    };

    const handleSave = async () => {
        if (!sentence.includes('[blank]')) {
            Alert.alert('Validation Error', 'Sentence must contain a [blank] placeholder.');
            return;
        }
        if (!category) {
            Alert.alert('Validation Error', 'Please enter a category.');
            return;
        }
        const validWords = words.filter(w => w.text.trim() !== '');
        if (validWords.length < 2) {
            Alert.alert('Validation Error', 'Please add at least 2 words.');
            return;
        }
        const hasCorrect = validWords.some(w => w.isCorrect);
        if (!hasCorrect) {
            Alert.alert('Validation Error', 'At least one word must be marked as Correct.');
            return;
        }

        setLoading(true);
        try {
            // 1. Prepare Words Array for JSONB
            const wordsJSON = validWords.map(w => ({
                word: w.text, // The schema uses 'word'
                is_correct: w.isCorrect,
                translations: w.translation ? { tr: w.translation } : {},
                explanations: w.explanation ? { tr: w.explanation } : {}
            }));

            // 2. Insert Question with Words JSON
            const { error } = await supabase
                .from('questions')
                .insert([{
                    level,
                    category,
                    sentence_en: sentence,
                    words: wordsJSON
                }]);

            if (error) throw error;

            Alert.alert('Success', 'Question added successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save question: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Question</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    <Text style={[styles.saveText, loading && { color: COLORS.textLight }]}>
                        {loading ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <Text style={styles.label}>Sentence (use [blank] for placeholder)</Text>
                <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    multiline
                    placeholder="E.g. The cat sat on the [blank]."
                    value={sentence}
                    onChangeText={setSentence}
                />

                <Text style={styles.label}>Level</Text>
                <View style={styles.row}>
                    {Levels.map(l => (
                        <TouchableOpacity
                            key={l}
                            style={[styles.chip, level === l && styles.chipActive, { backgroundColor: level === l ? COLORS.levels[l] : COLORS.surface }]}
                            onPress={() => setLevel(l)}
                        >
                            <Text style={[styles.chipText, level === l && { color: '#fff' }]}>{l.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Category</Text>
                <TextInput
                    style={styles.input}
                    placeholder="E.g. Grammar, Vocabulary, Legal"
                    value={category}
                    onChangeText={setCategory}
                />

                <Text style={styles.sectionHeader}>Words Options</Text>

                {words.map((word, index) => (
                    <View key={index} style={styles.wordRow}>
                        <View style={{ flex: 1 }}>
                            <TextInput
                                style={styles.wordInput}
                                placeholder="Word Text"
                                value={word.text}
                                onChangeText={(text) => updateWord(index, 'text', text)}
                            />
                            <TextInput
                                style={[styles.wordInput, { marginTop: 5, fontSize: 12 }]}
                                placeholder="TR Translation (Optional)"
                                value={word.translation}
                                onChangeText={(text) => updateWord(index, 'translation', text)}
                            />
                            <TextInput
                                style={[styles.wordInput, { marginTop: 5, fontSize: 12, fontStyle: 'italic' }]}
                                placeholder="TR Explanation (Optional)"
                                value={word.explanation}
                                onChangeText={(text) => updateWord(index, 'explanation', text)}
                            />
                        </View>

                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Correct?</Text>
                            <Switch
                                value={word.isCorrect}
                                onValueChange={(val) => updateWord(index, 'isCorrect', val)}
                                trackColor={{ false: '#767577', true: COLORS.success }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>

                        <TouchableOpacity onPress={() => removeWord(index)} style={styles.removeBtn}>
                            <Text style={styles.removeBtnText}>×</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity style={styles.addWordBtn} onPress={addWordField}>
                    <Text style={styles.addWordBtnText}>+ Add Another Word</Text>
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
    saveText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },

    content: {
        paddingHorizontal: LAYOUT.padding,
        paddingBottom: 50,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginTop: 15,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: LAYOUT.radius,
        padding: 15,
        fontSize: 16,
        ...SHADOWS.small,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipActive: {
        borderWidth: 0,
    },
    chipText: {
        fontWeight: '600',
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 30,
        marginBottom: 10,
        color: COLORS.textPrimary,
    },
    wordRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        padding: 15,
        borderRadius: LAYOUT.radius,
        marginBottom: 10,
        alignItems: 'center',
        gap: 10,
        ...SHADOWS.small,
    },
    wordInput: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingVertical: 5,
        fontSize: 16,
    },
    switchContainer: {
        alignItems: 'center',
    },
    switchLabel: {
        fontSize: 10,
        marginBottom: 5,
        color: COLORS.textSecondary,
    },
    removeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.error + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeBtnText: {
        color: COLORS.error,
        fontWeight: 'bold',
        fontSize: 18,
    },
    addWordBtn: {
        marginTop: 10,
        padding: 15,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: LAYOUT.radius,
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    addWordBtnText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
});
