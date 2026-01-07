import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, BaseButton, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { supabase } from '../lib/supabase';

export default function AddQuestionScreen({ navigation, route }) {
    const { questionId } = route.params || {};
    const isEditing = !!questionId;

    const [sentence, setSentence] = useState('');
    const [level, setLevel] = useState('A1');
    const [category, setCategory] = useState('');
    const [words, setWords] = useState([{ text: '', isCorrect: false, translations: {}, explanations: {} }]);
    const [loading, setLoading] = useState(false);
    const [selectedLang, setSelectedLang] = useState('tr');

    const Levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'IELTS', 'TOEFL'];
    const Languages = ['tr', 'en', 'es', 'de', 'fr', 'pt', 'jp', 'cn', 'ru', 'kr', 'ar'];

    React.useEffect(() => {
        if (isEditing) {
            fetchQuestionDetails();
        }
    }, [questionId]);

    const fetchQuestionDetails = async () => {
        setLoading(true);
        // Alias relation to linked_words
        const { data, error } = await supabase
            .from('questions')
            .select('*, linked_words:words(*)')
            .eq('id', questionId)
            .single();

        if (error) {
            Alert.alert('Error', 'Failed to load question details.');
            navigation.goBack();
        } else {
            setSentence(data.sentence_en);
            setLevel(data.level);
            setCategory(data.category);

            // Determine source of words: Relation > JSON Column > Legacy
            let sourceWords = [];
            if (data.linked_words && data.linked_words.length > 0) {
                sourceWords = data.linked_words;
            } else if (data.words) {
                sourceWords = typeof data.words === 'string' ? JSON.parse(data.words) : data.words;
            }

            // Populate Form
            if (sourceWords && Array.isArray(sourceWords) && sourceWords.length > 0) {
                const loadedWords = sourceWords.map(w => {
                    const translations = w.translations || {};
                    const explanations = w.explanations || {};
                    const isCorrect = w.is_correct || w.is_correct === 'true';

                    // Dynamic parsing of legacy keys (exp_en, exp_tr, exp_ch, etc.)
                    // This handles the format: {"exp_ch": "...", "exp_en": "..."}
                    Object.keys(w).forEach(key => {
                        if (key.startsWith('exp_')) {
                            let lang = key.replace('exp_', '');
                            // normalize codes 
                            if (lang === 'sp') lang = 'es';
                            if (lang === 'ch') lang = 'cn';
                            if (lang === 'kr') lang = 'kr';

                            // Assign to correct object based on isCorrect
                            if (isCorrect) {
                                if (!translations[lang]) translations[lang] = w[key];
                            } else {
                                if (!explanations[lang]) explanations[lang] = w[key];
                            }
                        }
                    });

                    // Flattened fallback (legacy specific single fields)
                    const trVal = w.translation || w.tr || w.word_tr;
                    if (trVal && !translations.tr) translations.tr = trVal;

                    const expVal = w.explanation || w.exp;
                    if (expVal && !explanations.tr) explanations.tr = expVal;

                    return {
                        id: w.id,
                        text: w.word_text || w.word || '',
                        isCorrect: isCorrect,
                        translations: translations,
                        explanations: explanations
                    };
                });
                setWords(loadedWords);
            }
        }
        setLoading(false);
    };

    const addWordField = () => {
        setWords([...words, { text: '', isCorrect: false, translations: {}, explanations: {} }]);
    };

    const updateWord = (index, field, value, subField = null) => {
        const newWords = [...words];
        if (field === 'translations' || field === 'explanations') {
            // Update nested object for displayed language
            if (!newWords[index][field]) newWords[index][field] = {};
            newWords[index][field][selectedLang] = value;
        } else {
            newWords[index][field] = value;
        }
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
                word: w.text,
                is_correct: w.isCorrect,
                translations: w.translations,
                explanations: w.explanations
            }));

            // 2. Insert Question with Words JSON
            // 2. Insert or Update Question
            let qError;
            let newQuestionId = questionId;

            if (isEditing) {
                const { error } = await supabase
                    .from('questions')
                    .update({
                        level,
                        category,
                        sentence_en: sentence
                    })
                    .eq('id', questionId);
                qError = error;
            } else {
                const { data, error } = await supabase
                    .from('questions')
                    .insert([{
                        level,
                        category,
                        sentence_en: sentence
                    }])
                    .select()
                    .single();
                qError = error;
                newQuestionId = data?.id;
            }

            if (qError) throw qError;

            // 3. Handle Words (Naive Approach: Delete All & Re-Insert)
            // Ideally we should update existing ones with IDs, but for simplicity in this admin tool:
            if (isEditing) {
                await supabase.from('words').delete().eq('question_id', questionId);
            }

            // Insert new word set
            const wordsPayload = validWords.map(w => ({
                question_id: newQuestionId, // Link to Question
                word_text: w.text,
                is_correct: w.isCorrect,
                translations: w.translations, // Save full object
                explanations: w.explanations
                // We don't save to legacy columns like exp_tr anymore, we rely on JSONB
            }));

            const { error: wError } = await supabase.from('words').insert(wordsPayload);
            if (wError) throw wError;

            // For legacy/compatibility, we might want to update the JSONB 'words' column in 'questions' table too if it exists
            // But we are moving to relational, so we skip that for now unless required.

            Alert.alert('Success', `Question ${isEditing ? 'updated' : 'added'} successfully!`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

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
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Question' : 'Add Question'}</Text>
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

                {/* Language Selector for Editing */}
                <View style={{ marginBottom: 15 }}>
                    <Text style={[styles.label, { marginTop: 0 }]}>Editing Language: <Text style={{ color: COLORS.primary }}>{selectedLang.toUpperCase()}</Text></Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {Languages.map(lang => (
                            <TouchableOpacity
                                key={lang}
                                style={[styles.chip, selectedLang === lang && styles.chipActive, { backgroundColor: selectedLang === lang ? COLORS.primary : COLORS.surface }]}
                                onPress={() => setSelectedLang(lang)}
                            >
                                <Text style={[styles.chipText, selectedLang === lang && { color: '#fff' }]}>{lang.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

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
                                style={styles.wordInput}
                                placeholder="Word Text"
                                value={word.text}
                                onChangeText={(text) => updateWord(index, 'text', text)}
                            />

                            {/* Dynamic Input: Translation if Correct, Explanation if Incorrect */}
                            <TextInput
                                style={[styles.wordInput, { marginTop: 5, fontSize: 12, fontStyle: word.isCorrect ? 'normal' : 'italic' }]}
                                placeholder={word.isCorrect
                                    ? `${selectedLang.toUpperCase()} Translation`
                                    : `${selectedLang.toUpperCase()} Explanation (Why is it wrong?)`
                                }
                                value={word.isCorrect
                                    ? (word.translations?.[selectedLang] || '')
                                    : (word.explanations?.[selectedLang] || '')
                                }
                                onChangeText={(text) => updateWord(index, word.isCorrect ? 'translations' : 'explanations', text)}
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
        flexWrap: 'wrap',
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
