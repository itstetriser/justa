
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { fetchAdminDailyWords, createDailyWord, updateDailyWord, deleteDailyWord } from '../lib/api';

export default function ManageWotdScreen({ navigation }) {
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formDate, setFormDate] = useState('');
    const [formLevel, setFormLevel] = useState('A1');
    const [formWord, setFormWord] = useState('');
    const [formType, setFormType] = useState('noun');
    // Definitions
    const [formDefEn, setFormDefEn] = useState('');
    const [formDefTr, setFormDefTr] = useState('');
    const [formDefEs, setFormDefEs] = useState('');
    const [formDefDe, setFormDefDe] = useState('');
    const [formDefFr, setFormDefFr] = useState('');
    const [formDefIt, setFormDefIt] = useState('');
    const [formDefJp, setFormDefJp] = useState('');
    const [formDefKr, setFormDefKr] = useState('');
    const [formDefCn, setFormDefCn] = useState('');
    const [formDefRu, setFormDefRu] = useState('');
    const [formDefPt, setFormDefPt] = useState('');

    useEffect(() => {
        loadWords();
    }, []);

    const loadWords = async () => {
        try {
            setLoading(true);
            const data = await fetchAdminDailyWords();
            setWords(data);
        } catch (e) {
            Alert.alert("Error", "Failed to load words");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formDate || !formWord || !formLevel) {
            Alert.alert("Missing Fields", "Please fill Date, Level, and Word");
            return;
        }

        const payload = {
            date: formDate,
            level: formLevel.toUpperCase(),
            word: formWord.toUpperCase(),
            part_of_speech: formType,
            definition_en: formDefEn,
            definition_tr: formDefTr,
            definition_es: formDefEs,
            definition_de: formDefDe,
            definition_fr: formDefFr,
            definition_it: formDefIt,
            definition_jp: formDefJp,
            definition_kr: formDefKr,
            definition_cn: formDefCn,
            definition_ru: formDefRu,
            definition_pt: formDefPt,
        };

        try {
            if (editingId) {
                await updateDailyWord(editingId, payload);
            } else {
                await createDailyWord(payload);
            }
            setModalVisible(false);
            resetForm();
            loadWords();
        } catch (e) {
            console.error("Save error:", e);
            Alert.alert("Error", "Failed to save. check console for details.");
        }
    };

    const handleDelete = (id) => {
        Alert.alert("Delete", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteDailyWord(id);
                        loadWords();
                    } catch (e) {
                        Alert.alert("Error", "Failed to delete");
                    }
                }
            }
        ]);
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setFormDate(item.date);
        setFormLevel(item.level);
        setFormWord(item.word);
        setFormType(item.part_of_speech || 'noun');
        setFormDefEn(item.definition_en || '');
        setFormDefTr(item.definition_tr || '');
        setFormDefEs(item.definition_es || '');
        setFormDefDe(item.definition_de || '');
        setFormDefFr(item.definition_fr || '');
        setFormDefIt(item.definition_it || '');
        setFormDefJp(item.definition_jp || '');
        setFormDefKr(item.definition_kr || '');
        setFormDefCn(item.definition_cn || '');
        setFormDefRu(item.definition_ru || '');
        setFormDefPt(item.definition_pt || '');
        setModalVisible(true);
    };

    const openNew = () => {
        resetForm();
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFormDate(tomorrow.toISOString().split('T')[0]);
        setModalVisible(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormDate('');
        setFormLevel('A1');
        setFormWord('');
        setFormType('noun');
        setFormDefEn('');
        setFormDefTr('');
        setFormDefEs('');
        setFormDefDe('');
        setFormDefFr('');
        setFormDefIt('');
        setFormDefJp('');
        setFormDefKr('');
        setFormDefCn('');
        setFormDefRu('');
        setFormDefPt('');
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.dateBadge}>{item.date}</Text>
                    <Text style={styles.levelBadge}>{item.level}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                        <Text style={styles.btnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                        <Text style={[styles.btnText, { color: '#fff' }]}>Del</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.wordText}>{item.word}</Text>
            <Text style={styles.defText} numberOfLines={1}>{item.definition_en}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage WOTD</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('BulkAddWotd')} style={styles.bulkBtn}>
                        <Text style={styles.addBtnText}>Bulk</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openNew} style={styles.addBtn}>
                        <Text style={styles.addBtnText}>+ Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={words}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshing={loading}
                onRefresh={loadWords}
            />

            {/* MODAL */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingId ? 'Edit Word' : 'New Word'}</Text>

                        <ScrollView contentContainerStyle={{ gap: 15 }}>
                            <View>
                                <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                                <TextInput style={styles.input} value={formDate} onChangeText={setFormDate} placeholder="2024-01-01" />
                            </View>

                            <View>
                                <Text style={styles.label}>Level (A1, A2...)</Text>
                                <TextInput style={styles.input} value={formLevel} onChangeText={text => setFormLevel(text.toUpperCase())} maxLength={2} />
                            </View>

                            <View>
                                <Text style={styles.label}>Word</Text>
                                <TextInput style={styles.input} value={formWord} onChangeText={setFormWord} autoCapitalize="characters" />
                            </View>

                            <View>
                                <Text style={styles.label}>Type (noun, verb...)</Text>
                                <TextInput style={styles.input} value={formType} onChangeText={setFormType} />
                            </View>

                            <View>
                                <Text style={styles.label}>Definition (EN)</Text>
                                <TextInput style={styles.input} value={formDefEn} onChangeText={setFormDefEn} multiline />
                            </View>

                            <View>
                                <Text style={styles.label}>Definition (TR)</Text>
                                <TextInput style={styles.input} value={formDefTr} onChangeText={setFormDefTr} multiline />
                            </View>

                            <View>
                                <Text style={styles.label}>Definition (ES)</Text>
                                <TextInput style={styles.input} value={formDefEs} onChangeText={setFormDefEs} multiline />
                            </View>
                            <View>
                                <Text style={styles.label}>Definition (DE)</Text>
                                <TextInput style={styles.input} value={formDefDe} onChangeText={setFormDefDe} multiline />
                            </View>
                            <View>
                                <Text style={styles.label}>Definition (FR)</Text>
                                <TextInput style={styles.input} value={formDefFr} onChangeText={setFormDefFr} multiline />
                            </View>
                            <View>
                                <Text style={styles.label}>Definition (IT)</Text>
                                <TextInput style={styles.input} value={formDefIt} onChangeText={setFormDefIt} multiline />
                            </View>
                            <View>
                                <Text style={styles.label}>Definition (JP)</Text>
                                <TextInput style={styles.input} value={formDefJp} onChangeText={setFormDefJp} multiline />
                            </View>
                            <View>
                                <Text style={styles.label}>Definition (KR)</Text>
                                <TextInput style={styles.input} value={formDefKr} onChangeText={setFormDefKr} multiline />
                            </View>
                            <View>
                                <Text style={styles.label}>Definition (CN)</Text>
                                <TextInput style={styles.input} value={formDefCn} onChangeText={setFormDefCn} multiline />
                            </View>
                            <View>
                                <Text style={styles.label}>Definition (RU)</Text>
                                <TextInput style={styles.input} value={formDefRu} onChangeText={setFormDefRu} multiline />
                            </View>
                            <View>
                                <Text style={styles.label}>Definition (PT)</Text>
                                <TextInput style={styles.input} value={formDefPt} onChangeText={setFormDefPt} multiline />
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                                <Text style={styles.saveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    bulkBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    addBtnText: { color: '#fff', fontWeight: 'bold' },

    list: { paddingHorizontal: LAYOUT.padding, paddingBottom: 50 },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: LAYOUT.radius,
        padding: 15,
        marginBottom: 10,
        ...SHADOWS.small,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    dateBadge: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    levelBadge: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginTop: 2,
    },
    actions: { flexDirection: 'row', gap: 10 },
    editBtn: { padding: 5 },
    deleteBtn: { backgroundColor: '#ff4444', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5 },
    btnText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary },
    wordText: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    defText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 5 },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 15
    },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    cancelBtn: { padding: 15 },
    cancelText: { color: COLORS.textSecondary, fontWeight: 'bold' },
    saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15 },
    saveText: { color: '#fff', fontWeight: 'bold' },
});
