import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
    FlatList, Alert, Modal, ActivityIndicator, Clipboard, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { useFocusEffect } from '@react-navigation/native';

export default function ManageQuestionsScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('ADD'); // 'ADD' | 'EDIT'

    // --- ADD TAB STATE ---
    const [bulkInput, setBulkInput] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addResult, setAddResult] = useState(null);

    // --- EDIT TAB STATE ---
    const [selectedLevel, setSelectedLevel] = useState('A1'); // Default to A1
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // --- BATCH MODAL STATE ---
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchInput, setBatchInput] = useState('');
    const [batchResult, setBatchResult] = useState(null);

    // Download Modal State
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [targetLang, setTargetLang] = useState(''); // e.g., 'tr', 'kr'

    const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    // --- FETCH LOGIC (EDIT TAB) ---
    const fetchQuestions = async (reset = false) => {
        if (reset) {
            setPage(1);
            setQuestions([]);
        }

        setLoading(true);
        try {
            const start = (reset ? 0 : (page - 1)) * limit;
            const end = start + limit - 1;

            let query = supabase
                .from('questions')
                .select('*', { count: 'exact' })
                .ilike('level', selectedLevel)
                .order('created_at', { ascending: false }) // Newest first
                .range(start, end);

            const { data, count, error } = await query;

            if (error) throw error;

            if (reset) {
                setQuestions(data);
            } else {
                setQuestions(prev => [...prev, ...data]);
            }
            setTotalQuestions(count || 0);
        } catch (e) {
            console.error("Fetch Error:", e);
            Alert.alert("Error", "Failed to fetch questions.");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'EDIT') {
                fetchQuestions(true);
            }
        }, [activeTab, selectedLevel])
    );

    const handleLoadMore = () => {
        if (!loading && questions.length < totalQuestions) {
            setPage(prev => prev + 1);
            fetchQuestions(); // Page updated in state, but need effect? No, fetch uses current state... wait.
            // Better to trigger effect or pass page. 
            // Simplified: Fetch next page explicitly
            const nextPage = page + 1;
            const start = (nextPage - 1) * limit;
            const end = start + limit - 1;

            // Re-implement simplified load more logic inline to avoid state closure issues
            (async () => {
                setLoading(true);
                const { data, error } = await supabase
                    .from('questions')
                    .select('*, words(*)')
                    .ilike('level', selectedLevel)
                    .order('created_at', { ascending: false })
                    .range(start, end);

                if (!error && data) {
                    setQuestions(prev => [...prev, ...data]);
                    setPage(nextPage);
                }
                setLoading(false);
            })();
        }
    };

    // --- ADD NEW LOGIC ---
    const processBulkAdd = async () => {
        if (!bulkInput.trim()) {
            Alert.alert("Empty", "Please paste content first.");
            return;
        }

        setIsAdding(true);
        setAddResult(null);

        // Regex-based parsing can be fragile. Switch to splitting by " <<<" or just "<<<"
        // Cleanup input first
        const rawBlocks = bulkInput.split('<<<').filter(b => b.trim().length > 5); // Filter empty splits

        const parsedItems = [];
        const errors = [];

        for (const block of rawBlocks) {
            try {
                // expecting: SENTENCE --- LEVEL --- CATEGORY --- [JSON] >>>
                // clean up the trailing >>>
                const cleanBlock = block.split('>>>')[0].trim();

                const parts = cleanBlock.split('---');
                if (parts.length < 4) {
                    console.warn("Skipping invalid block:", cleanBlock.substring(0, 20));
                    continue;
                }

                const rawSent = parts[0].trim();
                const rawLevel = parts[1].trim();
                const rawCat = parts[2].trim();
                // The JSON might contain --- chars, so we join the rest back in case
                const rawJson = parts.slice(3).join('---').trim();

                const wordList = JSON.parse(rawJson);

                // Prepare Words Data
                const wordsToInsert = wordList.map(w => {
                    const explanations = {};
                    // Auto-detect "exp_" keys
                    Object.keys(w).forEach(key => {
                        if (key.startsWith('exp_')) {
                            const langCode = key.replace('exp_', ''); // en, tr, sp...
                            explanations[langCode] = w[key];
                        }
                    });

                    return {
                        word_text: w.word,
                        is_correct: w.is_correct,
                        explanations: explanations
                        // translations: {} // Schema has it, but user input focused on exp
                    };
                });

                parsedItems.push({
                    sentence_en: rawSent,
                    level: rawLevel,
                    category: rawCat,
                    words: wordsToInsert
                });

            } catch (e) {
                console.error("Parse Error Item:", e);
                errors.push(`Failed to parse block starting: ${block.substring(0, 30)}...`);
            }
        }

        if (parsedItems.length === 0) {
            setIsAdding(false);
            Alert.alert("Error", "No valid items found. Check format!");
            return;
        }

        // --- BATCH INSERT ---
        let successCount = 0;
        let failCount = 0;

        for (const item of parsedItems) {
            try {
                // Single-Table Insert: Save words JSON directly to 'words' column
                const { error: qError } = await supabase
                    .from('questions')
                    .insert({
                        level: item.level,
                        category: item.category,
                        sentence_en: item.sentence_en,
                        words: item.words, // JSONB insertion
                        is_active: true
                    });

                if (qError) throw qError;

                successCount++;
            } catch (e) {
                console.error("Insert DB Error:", e);
                failCount++;
            }
        }

        setIsAdding(false);
        setAddResult(`Success: ${successCount}\nFailed: ${failCount}`);
        if (successCount > 0) setBulkInput(''); // Clear on success
    };

    // --- BATCH UPDATE LOGIC ---
    const processBatchUpdate = async () => {
        if (!batchInput.trim()) {
            Alert.alert("Empty", "Please paste update parsing string.");
            return;
        }
        setLoading(true);
        setBatchResult(null);

        // FORMAT: <<<ID---{"TARGET_WORD"---key:"val"}>>>
        // e.g. <<<123-456---{"hotel"---exp_it:"..."}>>>
        const blocks = batchInput.split('<<<').filter(b => b.trim().length > 5);
        let success = 0;
        let fail = 0;
        const details = [];

        for (const block of blocks) {
            try {
                const clean = block.split('>>>')[0].trim();

                // NEW PARSING LOGIC:
                // format: ID---{...}---{...}
                // Naive split('---') breaks because {...} contains --- too.

                // 1. Get ID (everything before first ---)
                const firstDash = clean.indexOf('---');
                if (firstDash === -1) {
                    details.push(`Invalid Block format (no ID/separator): ${clean.substring(0, 20)}`);
                    fail++;
                    continue;
                }

                const qId = clean.substring(0, firstDash).trim();

                // 2. Extract JSON-like blocks using Regex
                // We look for anything wrapped in {}
                const updateBlocks = clean.match(/\{.*?\}/g);

                if (!updateBlocks || updateBlocks.length === 0) {
                    details.push(`ID ${qId}: No update blocks found.`);
                    fail++;
                    continue;
                }

                // 1. Fetch current question
                const { data: qData, error: qErr } = await supabase
                    .from('questions')
                    .select('words')
                    .eq('id', qId)
                    .single();

                if (qErr || !qData) {
                    details.push(`ID ${qId}: Not found or error.`);
                    fail++;
                    continue;
                }

                let currentWords = qData.words || [];
                let modified = false;

                // 2. Parse updates
                // update string: {"hotel"---exp_it:"..."}  -> needs parsing
                // Actually, the format user uses is a bit pseudo-json. 
                // Let's assume user provides: {"word"---key:"val"} or multiple
                // We will try to allow flexible JSON or just Regex parsing.

                // Robust approach: 
                // for each update part in the string:
                // part = {"hotel"---exp_it:"..."}

                updateBlocks.forEach(upPart => {
                    // Remove braces
                    const inner = upPart.trim().replace(/^{/, '').replace(/}$/, '').trim();
                    // Split by ---
                    // INNER: "hotel"---exp_it:"..."
                    const p = inner.split('---');
                    if (p.length < 2) return;

                    const targetWord = p[0].replace(/"/g, '').trim();
                    // p[1] could be 'exp_it: "..."'

                    // Find word in DB array
                    const wordIdx = currentWords.findIndex(w => (w.word_text || "").toLowerCase() === targetWord.toLowerCase());

                    if (wordIdx !== -1) {
                        const wordObj = currentWords[wordIdx];
                        if (!wordObj.explanations) wordObj.explanations = {};

                        const kv = p[1].trim();
                        const colonIdx = kv.indexOf(':');
                        if (colonIdx !== -1) {
                            let key = kv.substring(0, colonIdx).trim(); // exp_it
                            // Fix: Remove 'exp_' prefix to store clean lang code (e.g. 'it')
                            if (key.startsWith('exp_')) key = key.replace('exp_', '');

                            let val = kv.substring(colonIdx + 1).trim(); // "..."
                            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);

                            wordObj.explanations[key] = val;
                            modified = true;
                        }
                    } else {
                        // Optional: track which word failed for better error msg
                        // details.push(`Word '${targetWord}' not found in Q ${qId}`);
                    }
                });

                // 3. Update DB if modified
                if (modified) {
                    const { error: uErr } = await supabase
                        .from('questions')
                        .update({ words: currentWords })
                        .eq('id', qId);

                    if (uErr) throw uErr;
                    success++;
                } else {
                    details.push(`ID ${qId}: No words matched (Logic: ${currentWords.map(w => w.word_text).join(',')})`);
                    fail++;
                }

            } catch (e) {
                console.error("Batch Item Error", e);
                fail++;
                details.push("Parse/Save Error on block.");
            }
        }

        setLoading(false);
        setBatchResult(`Finished. Success: ${success}, Fail: ${fail}\n\nDetails:\n${details.join('\n')}`);
        if (success > 0) {
            setBatchInput('');
            // fetchQuestions(true); // Don't auto-refresh, let user see result first
        }
    };

    // --- SELECTION LOGIC ---
    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        if (selectedIds.size === questions.length) {
            setSelectedIds(new Set());
        } else {
            const allIds = questions.map(q => q.id);
            setSelectedIds(new Set(allIds));
        }
    };

    // --- DOWNLOAD PARSER ---
    const handleDownload = () => {
        if (selectedIds.size === 0) {
            Alert.alert("Select Questions", "Please select at least one question.");
            return;
        }
        setTargetLang(''); // Reset
        setShowDownloadModal(true);
    };

    const performDownload = () => {
        // Format: 1 --- id --- sentence --- {word1...}-{word2...}
        const selectedQuestions = questions.filter(q => selectedIds.has(q.id));

        const lines = selectedQuestions.map((q, index) => {
            const wordBlocks = (q.words || []).map(w => {
                // Format: {"word"---exp_en:...---"exp_target":"..."}
                // User requested: {"word"--- exp_en---exp_..(target)}

                // Base: English + Target
                const expEn = (w.explanations?.['en'] || w.explanations?.['exp_en'] || "").replace(/"/g, "'");

                let block = `"${w.word_text}",---exp_en:"${expEn}"`;

                if (targetLang) {
                    const expTarget = (w.explanations?.[targetLang] || w.explanations?.[`exp_${targetLang}`] || "").replace(/"/g, "'");
                    block += `---"exp_${targetLang}": "${expTarget}"`;
                }

                return `{${block}}`;
            }).join('-');

            return `${index + 1} --- ${q.id} --- sentence_en: ${q.sentence_en}---${wordBlocks}`;
        });

        const output = lines.join('\n\n');
        setLoading(false);
        setBatchResult(`Done! Success: ${successCount}, Failed: ${failCount}\n${errors.join('\n')}`);
        if (successCount > 0) {
            setBatchInput('');
            // Refresh list if needed (optional)
        }
    };


    // --- RENDERERS ---

    const renderAddTab = () => (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1, padding: 20 }}>
                <Text style={styles.label}>Paste Bulk Content (Add New):</Text>
                <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={15}
                    placeholder={`<<<Sentence...---A2---Cat---[{"word":"abc", \n "exp_en":"...", \n "exp_tr":"..."}]>>>`}
                    value={bulkInput}
                    onChangeText={setBulkInput}
                    textAlignVertical="top"
                />

                {addResult && (
                    <Text style={{ marginVertical: 10, fontWeight: 'bold', color: COLORS.primary }}>
                        {addResult}
                    </Text>
                )}

                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={processBulkAdd}
                    disabled={isAdding}
                >
                    {isAdding ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Add Questions</Text>}
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );

    const renderBatchModal = () => (
        <Modal
            visible={showBatchModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowBatchModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { height: '80%', width: '90%' }]}>
                    <Text style={styles.modalTitle}>Batch Update</Text>
                    <Text style={{ color: '#666', marginBottom: 10, fontSize: 12 }}>
                        Format: {'<<<ID---{"word"---exp_jp:"..."}>>>'}
                    </Text>

                    <TextInput
                        style={[styles.textArea, { flex: 1, marginBottom: 10 }]}
                        multiline
                        placeholder="Paste batch update string..."
                        value={batchInput}
                        onChangeText={setBatchInput}
                        textAlignVertical="top"
                    />

                    {batchResult ? (
                        <Text style={{ marginVertical: 10, fontWeight: 'bold', color: COLORS.primary }}>{batchResult}</Text>
                    ) : null}

                    <TouchableOpacity style={styles.primaryBtn} onPress={processBatchUpdate} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Run Update</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowBatchModal(false)} style={{ marginTop: 15 }}>
                        <Text style={{ color: '#999' }}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderEditTab = () => (
        <View style={{ flex: 1 }}>
            {/* Level Tabs */}
            <View style={styles.levelRow}>
                {LEVELS.map(L => (
                    <TouchableOpacity
                        key={L}
                        style={[styles.levelTab, selectedLevel === L && styles.activeLevelTab]}
                        onPress={() => setSelectedLevel(L)}
                    >
                        <Text style={[styles.levelText, selectedLevel === L && { color: '#fff' }]}>{L}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Toolbar */}
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={selectAll}>
                    <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>
                        {selectedIds.size === questions.length && questions.length > 0 ? 'Deselect All' : 'Select All'} (On Page)
                    </Text>
                </TouchableOpacity>
                <Text style={{ color: '#999' }}>{questions.length} / {totalQuestions}</Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {/* Batch Update Button */}
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#6c757d' }]}
                        onPress={() => setShowBatchModal(true)}
                    >
                        <Text style={{ color: '#fff', fontSize: 12 }}>Batch Update</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { opacity: selectedIds.size ? 1 : 0.5 }]}
                        onPress={handleDownload}
                        disabled={selectedIds.size === 0}
                    >
                        <Text style={{ color: '#fff', fontSize: 12 }}>Download Meta</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={questions}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 80 }}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        style={[styles.row, selectedIds.has(item.id) && styles.selectedRow]}
                        onPress={() => toggleSelection(item.id)}
                    >
                        <View style={{ width: 30, alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, color: '#999' }}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1, paddingHorizontal: 10 }}>
                            <Text style={styles.rowText} numberOfLines={2}>{item.sentence_en}</Text>
                            <Text style={{ fontSize: 10, color: '#999' }}>{item.category} • {item.words?.length} words</Text>
                            <Text style={{ fontSize: 8, color: '#ccc' }}>{item.id}</Text>
                        </View>
                        <View style={styles.checkbox}>
                            {selectedIds.has(item.id) && <Text style={{ color: COLORS.primary }}>✓</Text>}
                        </View>
                    </TouchableOpacity>
                )}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} /> : null}
            />
        </View>
    );

    const renderDownloadModal = () => (
        <Modal
            visible={showDownloadModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDownloadModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Download Details</Text>
                    <Text style={{ color: '#666', marginBottom: 20 }}>Select extra language (EN included by default):</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="e.g. tr, kr, sp (Language Code)"
                        value={targetLang}
                        onChangeText={setTargetLang}
                        autoCapitalize="none"
                    />

                    <TouchableOpacity style={styles.primaryBtn} onPress={performDownload}>
                        <Text style={styles.btnText}>Generate & Copy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowDownloadModal(false)} style={{ marginTop: 15 }}>
                        <Text style={{ color: '#999' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );



    return (
        <View style={styles.container}>
            {/* Header Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'ADD' && styles.activeTab]}
                    onPress={() => setActiveTab('ADD')}
                >
                    <Text style={[styles.tabText, activeTab === 'ADD' && styles.activeTabText]}>Add New Questions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'EDIT' && styles.activeTab]}
                    onPress={() => setActiveTab('EDIT')}
                >
                    <Text style={[styles.tabText, activeTab === 'EDIT' && styles.activeTabText]}>Edit Questions</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'ADD' ? renderAddTab() : renderEditTab()}
            {renderDownloadModal()}
            {renderBatchModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, elevation: 2 },
    tab: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: COLORS.primary },
    tabText: { fontWeight: 'bold', color: COLORS.textSecondary },
    activeTabText: { color: COLORS.primary },
    label: { fontWeight: 'bold', marginBottom: 5, color: COLORS.textPrimary },
    textArea: {
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: '#eee',
        minHeight: 200,
        textAlignVertical: 'top'
    },
    primaryBtn: {
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20
    },
    btnText: { color: '#fff', fontWeight: 'bold' },
    // Edit Styles
    levelRow: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    levelTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, marginRight: 8, backgroundColor: '#f0f0f0' },
    activeLevelTab: { backgroundColor: COLORS.primary },
    levelText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
    toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#fafafa' },
    actionBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5 },
    row: {
        flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: COLORS.surface,
        borderBottomWidth: 1, borderColor: '#f0f0f0'
    },
    selectedRow: { backgroundColor: '#E5F2FF' },
    rowText: { color: COLORS.textPrimary, fontWeight: '500' },
    checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
    modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 25, alignItems: 'center', width: '90%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    input: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, width: '100%' }
});
