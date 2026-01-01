import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { supabase } from '../lib/supabase';

export default function BulkAddScreen({ navigation }) {
    const [rawText, setRawText] = useState('');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);

    const exampleFormat = `<<<Question text [blank]---difficulty---cat---words[{"word": "answer", "is_correct": true}]>>>`;

    const parseAndUpload = async () => {
        setLoading(true);
        setLogs([]);
        const newLogs = [];

        try {
            // 1. Extract blocks between <<< and >>>
            const regex = /<<<([\s\S]*?)>>>/g;
            const matches = [...rawText.matchAll(regex)];

            if (matches.length === 0) {
                Alert.alert('Parser Error', 'No blocks found matching <<<...>>>');
                setLoading(false);
                return;
            }

            let successCount = 0;
            let failCount = 0;

            for (const match of matches) {
                const blockContent = match[1]; // Inner content
                const parts = blockContent.split('---');

                if (parts.length < 4) {
                    newLogs.push(`❌ format error (needs 4 parts): ${blockContent.substring(0, 30)}...`);
                    failCount++;
                    continue;
                }

                const sentence = parts[0].trim();
                const level = parts[1].trim();
                const category = parts[2].trim();
                let jsonString = parts[3].trim();

                // Handle "words[...]" format if user includes the prefix
                if (jsonString.startsWith('words')) {
                    jsonString = jsonString.substring(5).trim();
                }

                try {
                    const wordsJSON = JSON.parse(jsonString);

                    // Insert into Supabase
                    const { error } = await supabase
                        .from('questions')
                        .insert([{
                            sentence_en: sentence,
                            level: level.toLowerCase(),
                            category: category,
                            words: wordsJSON
                        }]);

                    if (error) throw error;

                    newLogs.push(`✅ Saved: ${sentence.substring(0, 30)}...`);
                    successCount++;

                } catch (err) {
                    newLogs.push(`❌ Error: ${err.message} in block starting with "${sentence.substring(0, 20)}..."`);
                    failCount++;
                }
            }

            setLogs(newLogs);
            Alert.alert(
                'Bulk Process Complete',
                `Success: ${successCount}\nFailed: ${failCount}`,
                [{ text: 'OK' }]
            );

        } catch (e) {
            Alert.alert('Critical Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bulk Add</Text>
                <TouchableOpacity onPress={parseAndUpload} disabled={loading || !rawText} style={styles.uploadBtn}>
                    <Text style={styles.uploadBtnText}>{loading ? '...' : 'Upload'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.label}>Paste your bulk text here:</Text>
                <TextInput
                    style={styles.input}
                    multiline
                    numberOfLines={10}
                    placeholder="<<<Question---level---cat---[...]>>>"
                    value={rawText}
                    onChangeText={setRawText}
                    textAlignVertical="top"
                />

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>Reference Format:</Text>
                    <Text style={styles.code}>{exampleFormat}</Text>
                    <Text style={styles.infoNote}>* Ensure words JSON is valid.</Text>
                </View>

                {logs.length > 0 && (
                    <View style={styles.logsContainer}>
                        <Text style={styles.logsTitle}>Logs:</Text>
                        {logs.map((log, index) => (
                            <Text key={index} style={[styles.logItem, log.includes('❌') ? styles.logError : styles.logSuccess]}>
                                {log}
                            </Text>
                        ))}
                    </View>
                )}
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
    uploadBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20
    },
    uploadBtnText: { color: '#fff', fontWeight: 'bold' },
    content: {
        paddingHorizontal: LAYOUT.padding,
    },
    label: {
        fontSize: 16,
        color: COLORS.textPrimary,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 15,
        height: 200,
        fontSize: 12,
        fontFamily: 'monospace',
        marginBottom: 20,
        ...SHADOWS.small,
    },
    infoBox: {
        backgroundColor: '#eef2f5',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    infoTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
        color: COLORS.textSecondary,
    },
    code: {
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#333',
        backgroundColor: '#fff',
        padding: 5,
        borderRadius: 5,
    },
    infoNote: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginTop: 5,
        fontStyle: 'italic',
    },
    logsContainer: {
        marginTop: 10,
        paddingBottom: 50,
    },
    logsTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
    },
    logItem: {
        fontSize: 12,
        marginBottom: 4,
    },
    logSuccess: { color: 'green' },
    logError: { color: 'red' },
});
