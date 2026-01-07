
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { createDailyWord } from '../lib/api';

export default function BulkAddWotdScreen({ navigation }) {
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [log, setLog] = useState('');

    const handleProcess = async () => {
        if (!inputText.trim()) {
            Alert.alert("Empty", "Please paste your data first.");
            return;
        }

        setLoading(true);
        setLog('');
        // 1. Normalize input: replace literal "\n" strings or just splitting errors
        let textToProcess = inputText.trim();

        // 2. Split logic
        // If the user pastes a long single line, we need to split by the DATE pattern (YYYY-MM-DD)
        // Regex lookahead: split before YYYY-MM-DD
        let lines = [];
        if (textToProcess.includes('\n')) {
            lines = textToProcess.split('\n');
        } else {
            // Split by Lookahead for date pattern: ?=202[0-9]-[0-1][0-9]-[0-3][0-9]
            // This splits BEFORE the date, keeping the date in the next chunk
            lines = textToProcess.split(/(?=202\d-\d{2}-\d{2})/);
        }

        let successCount = 0;
        let failCount = 0;
        let newLog = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split('|').map(p => p.trim());

            if (parts.length < 5) {
                // Try to match specific structure if pipe split fails or is messy
                // Not doing deeper regex for now, assume pipes exist
                newLog += `❌ Line ${i + 1}: Invalid format (needs 5 parts). Found ${parts.length}: "${line.substring(0, 20)}..."\n`;
                failCount++;
                continue;
            }

            const [date, level, word, type, defEn] = parts;

            try {
                await createDailyWord({
                    date,
                    level: level.toUpperCase(),
                    word: word.toUpperCase(),
                    part_of_speech: type,
                    definition_en: defEn,
                    // definition_tr: '', // Others empty by default
                });
                newLog += `✅ ${word} (${level}) added for ${date}\n`;
                successCount++;
            } catch (e) {
                console.error(e);
                // Check for duplicate error
                if (e.message?.includes('duplicate key')) {
                    newLog += `⚠️ Line ${i + 1}: Skipped (Already exists: ${date}/${level})\n`;
                } else {
                    newLog += `❌ Line ${i + 1}: Error - ${e.message}\n`;
                }
                failCount++;
            }
        }

        setLog(newLog);
        setLoading(false);
        Alert.alert("Finished", `Processed ${lines.length} lines.\nSuccess: ${successCount}\nFailed/Skipped: ${failCount}`);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bulk Add Words</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.instructions}>
                    Paste words below. Format per line:
                </Text>
                <Text style={styles.format}>
                    YYYY-MM-DD | Level | Word | Type | Definition (EN)
                </Text>
                <Text style={styles.example}>
                    Example: 2024-02-01 | A1 | CAT | noun | A small animal
                </Text>

                <TextInput
                    style={styles.input}
                    multiline
                    placeholder="Paste data here..."
                    value={inputText}
                    onChangeText={setInputText}
                    autoCapitalize="none"
                    autoCorrect={false}
                />

                <TouchableOpacity
                    style={[styles.processBtn, loading && { opacity: 0.7 }]}
                    onPress={handleProcess}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Process & Upload</Text>}
                </TouchableOpacity>

                {log ? (
                    <View style={styles.logContainer}>
                        <Text style={styles.logTitle}>Log:</Text>
                        <ScrollView style={styles.logScroll}>
                            <Text style={styles.logText}>{log}</Text>
                        </ScrollView>
                    </View>
                ) : null}
            </View>
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
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
    content: {
        flex: 1,
        paddingHorizontal: LAYOUT.padding,
    },
    instructions: {
        color: COLORS.textPrimary,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    format: {
        fontFamily: 'monospace',
        backgroundColor: '#eee',
        padding: 5,
        borderRadius: 5,
        fontSize: 12,
        marginBottom: 5,
    },
    example: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginBottom: 15,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 15,
        height: 200,
        textAlignVertical: 'top',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 20,
    },
    processBtn: {
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    logContainer: {
        marginTop: 20,
        flex: 1,
        marginBottom: 20,
    },
    logTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
    logScroll: {
        backgroundColor: '#000',
        borderRadius: 10,
        padding: 10,
    },
    logText: {
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 12,
    }
});
