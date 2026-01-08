
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';
import { getTranslation } from '../lib/translations';
import { fetchDailyWord, checkDailyBonusStatus, claimDailyBonus } from '../lib/api';
import * as Haptics from 'expo-haptics';

export default function WordOfTheDay({ userId, level, dailyScore, appLang, onBonusClaimed }) {
    const [wordData, setWordData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isClaimed, setIsClaimed] = useState(false);
    const [showGameModal, setShowGameModal] = useState(false);

    // Game State
    const [scrambledLetters, setScrambledLetters] = useState([]);
    const [userGuess, setUserGuess] = useState([]);
    const [gameStatus, setGameStatus] = useState('PLAYING'); // PLAYING, SUCCESS, FAIL

    const t = (key) => getTranslation(appLang, key);

    // Points needed per letter (30 points per letter)
    const POINTS_PER_LETTER = 30;
    const targetScore = wordData ? (wordData.word.length * POINTS_PER_LETTER) : 9999;
    const isUnlocked = dailyScore >= targetScore;

    useEffect(() => {
        if (userId) {
            loadDailyWord();
        }
    }, [level, userId]);

    const loadDailyWord = async () => {
        try {
            setLoading(true);
            const word = await fetchDailyWord(level);
            const claimed = await checkDailyBonusStatus(userId);

            setWordData(word);
            setIsClaimed(claimed);
        } catch (e) {
            console.error("Failed to load WOTD:", e);
        } finally {
            setLoading(false);
        }
    };

    const startGame = () => {
        if (!wordData) return;

        const targetWord = wordData.word.toUpperCase();
        const letters = targetWord.split('');
        // Create objects first to ensure IDs are tracked
        let scrambledObjs = letters.map((l, i) => ({ id: i, char: l, used: false }));

        // Shuffle manually (simple fisher-yates for objects)
        for (let i = scrambledObjs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [scrambledObjs[i], scrambledObjs[j]] = [scrambledObjs[j], scrambledObjs[i]];
        }

        // HINT LOGIC: Find the first letter of the word in the scrambled set
        const firstChar = targetWord[0];
        const hintLetter = scrambledObjs.find(l => l.char === firstChar);

        let initialGuess = [];
        if (hintLetter) {
            hintLetter.used = true;
            initialGuess.push({ ...hintLetter, status: 'correct' });
        }

        setScrambledLetters(scrambledObjs);
        setUserGuess(initialGuess);
        setGameStatus('PLAYING');
        setShowGameModal(true);
    };

    const handleLetterPress = (letterObj) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const targetWord = wordData.word.toUpperCase();
        const currentIndex = userGuess.length;

        // Check Correctness
        const isCorrect = letterObj.char === targetWord[currentIndex];
        const status = isCorrect ? 'correct' : 'wrong';

        // Add to guess
        const newGuess = [...userGuess, { ...letterObj, status }];
        setUserGuess(newGuess);

        // Mark as used
        setScrambledLetters(prev => prev.map(l => l.id === letterObj.id ? { ...l, used: true } : l));

        // Check if word is complete
        if (newGuess.length === targetWord.length) {
            const guessedWord = newGuess.map(l => l.char).join('');
            if (guessedWord === targetWord) {
                handleWin();
            } else {
                // Wrong guess logic - auto reset after delay
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                // Keep the hint when resetting? Or full reset? 
                // User requirement: "turn letter green otherwise red" implies we see the red.
                // If the word is full but wrong, we probably want to reset the WRONG letters?
                // For now, adhering to previous behavior (reset) but maybe we should keep the correct ones?
                // Let's reset but keep the HINT.
                setTimeout(() => resetGame(false), 800);
            }
        }
    };

    // ... (handleUndo remains mostly same, maybe ensure we don't undo the hint?)

    const handleUndo = () => {
        // Prevent undoing the first letter (Hint)
        if (userGuess.length <= 1) return;

        const lastLetter = userGuess[userGuess.length - 1];
        setUserGuess(prev => prev.slice(0, -1));
        setScrambledLetters(prev => prev.map(l => l.id === lastLetter.id ? { ...l, used: false } : l));
    };

    const resetGame = (fullReset = true) => {
        if (fullReset) {
            startGame(); // Just restart properly
        } else {
            // Partial reset (retry)
            // Keep the hint (index 0)
            const hint = userGuess[0];

            // Unmark used for everything EXCEPT the hint
            setScrambledLetters(prev => prev.map(l => l.id === hint.id ? l : { ...l, used: false }));
            setUserGuess([hint]);
        }
    };

    const handleWin = async () => {
        setGameStatus('SUCCESS');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            await claimDailyBonus(userId);
            setIsClaimed(true);
            if (onBonusClaimed) onBonusClaimed();
        } catch (e) {
            // Already claimed or network error, just show success
            console.log("Bonus claim note:", e);
        }
    };

    if (loading) return <ActivityIndicator style={{ margin: 20 }} />;
    // if (!wordData) return null; // Old behavior: disappeared.
    if (!wordData) {
        return (
            <View style={styles.card}>
                <Text style={styles.title}>📅 {t('wordOfTheDay') || 'Word of the Day'}</Text>
                <Text style={{ textAlign: 'center', color: '#999', marginVertical: 20 }}>
                    {t('noWordToday') || 'No word available for today.'}
                </Text>
            </View>
        );
    }

    // 1. CLAIMED STATE
    if (isClaimed) {
        return (
            <View style={styles.card}>
                <View style={[styles.headerRow, { marginBottom: 10 }]}>
                    <Text style={styles.title}>📅 {t('wordOfTheDay') || 'Word of the Day'}</Text>
                    <View style={styles.claimedBadge}>
                        <Text style={styles.claimedText}>✓ {t('collected') || 'Collected'}</Text>
                    </View>
                </View>

                <Text style={styles.theWord}>{wordData.word}</Text>
                <Text style={styles.definition}>
                    {wordData[`definition_${appLang}`] || wordData.definition_en || "No definition"}
                </Text>
            </View>
        );
    }

    // 2. LOCKED STATE
    if (!isUnlocked) {
        const progress = Math.min(dailyScore / targetScore, 1);

        return (
            <View style={styles.card}>
                <Text style={styles.title}>📅 {t('wordOfTheDay') || 'Word of the Day'}</Text>
                <Text style={styles.subTitle}>
                    {t('wotdLockedDesc') || 'Earn points to unlock today\'s word!'}
                </Text>

                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{dailyScore} / {targetScore} pts</Text>

                <View style={styles.mysteryWord}>
                    {wordData.word.split('').map((_, i) => (
                        <View key={i} style={styles.mysteryChar}>
                            <Text style={styles.mysteryText}>?</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    // 3. UNLOCKED STATE (Ready to Play)
    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>📅 {t('wordOfTheDay') || 'Word of the Day'}</Text>
                <View style={styles.unlockedBadge}>
                    <Text style={styles.unlockedText}>🔓 {t('unlocked') || 'Unlocked!'}</Text>
                </View>
            </View>

            <Text style={styles.subTitle}>{t('wotdReady') || 'Unscramble the word to get +50 points!'}</Text>

            <TouchableOpacity style={styles.playBtn} onPress={startGame}>
                <Text style={styles.playBtnText}>{t('playWotd') || 'Solve & Win (+50)'}</Text>
            </TouchableOpacity>

            {/* GAME MODAL */}
            <Modal
                visible={showGameModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGameModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('unscramble') || 'Unscramble!'}</Text>

                        {/* Definition Hint */}
                        <Text style={[styles.definition, { marginBottom: 20 }]}>
                            {wordData[`definition_${appLang}`] || wordData.definition_en}
                        </Text>

                        {/* Slots */}
                        <View style={styles.slotsContainer}>
                            {Array.from({ length: wordData.word.length }).map((_, i) => {
                                const guess = userGuess[i];
                                let slotStyle = styles.slot;
                                let textStyle = styles.slotText;

                                if (gameStatus === 'SUCCESS') {
                                    slotStyle = [styles.slot, styles.slotSuccess];
                                } else if (guess) {
                                    if (guess.status === 'correct') {
                                        slotStyle = [styles.slot, { borderBottomColor: COLORS.success, backgroundColor: '#E5F9E7' }];
                                        textStyle = [styles.slotText, { color: COLORS.success }];
                                    } else {
                                        slotStyle = [styles.slot, { borderBottomColor: COLORS.error, backgroundColor: '#FFE5E5' }];
                                        textStyle = [styles.slotText, { color: COLORS.error }];
                                    }
                                }

                                return (
                                    <View key={i} style={slotStyle}>
                                        <Text style={textStyle}>
                                            {guess?.char || ''}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Scrambled Letters Controls */}
                        {gameStatus !== 'SUCCESS' ? (
                            <View style={styles.lettersContainer}>
                                {scrambledLetters.map((l) => (
                                    <TouchableOpacity
                                        key={l.id}
                                        style={[styles.letterBtn, l.used && styles.letterUsed]}
                                        onPress={() => !l.used && handleLetterPress(l)}
                                        disabled={l.used}
                                    >
                                        <Text style={[styles.letterText, l.used && { color: '#ccc' }]}>
                                            {l.char}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                <Text style={styles.successEmoji}>🎉 +50</Text>
                                <Text style={styles.definition}>
                                    {wordData[`definition_${appLang}`] || wordData.definition_en}
                                </Text>
                            </View>
                        )}

                        <View style={styles.actionsRow}>
                            {gameStatus !== 'SUCCESS' && (
                                <TouchableOpacity onPress={handleUndo} style={styles.actionLink}>
                                    <Text style={styles.actionText}>⌫ {t('undo') || 'Undo'}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={() => setShowGameModal(false)}
                                style={[styles.secondaryBtn, gameStatus === 'SUCCESS' && { backgroundColor: COLORS.primary }]}
                            >
                                <Text style={[styles.secondaryBtnText, gameStatus === 'SUCCESS' && { color: '#fff' }]}>
                                    {gameStatus === 'SUCCESS' ? (t('collect') || 'Collect') : (t('cancel') || 'Cancel')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: LAYOUT.radius,
        padding: 20,
        marginBottom: 20,
        ...SHADOWS.medium,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    subTitle: {
        color: COLORS.textSecondary,
        marginBottom: 15,
        fontSize: 14,
    },
    progressContainer: {
        height: 10,
        backgroundColor: '#eee',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 5,
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    progressText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'right',
        marginBottom: 15,
    },
    mysteryWord: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    mysteryChar: {
        width: 40,
        height: 40,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mysteryText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ccc',
    },
    playBtn: {
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    playBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    unlockedBadge: {
        backgroundColor: '#E5F9E7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    unlockedText: {
        color: COLORS.success,
        fontWeight: 'bold',
        fontSize: 12,
    },
    claimedBadge: {
        backgroundColor: '#eee',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    claimedText: {
        color: '#666',
        fontWeight: 'bold',
        fontSize: 12,
    },
    theWord: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.primary,
        textAlign: 'center',
        marginVertical: 10,
        letterSpacing: 2,
    },
    definition: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        color: COLORS.textPrimary,
    },
    slotsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 40,
    },
    slot: {
        width: 44,
        height: 50,
        borderBottomWidth: 3,
        borderBottomColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    slotSuccess: {
        borderBottomColor: COLORS.success,
    },
    slotText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    lettersContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 30,
    },
    letterBtn: {
        width: 50,
        height: 50,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: '#eee',
    },
    letterUsed: {
        backgroundColor: '#f5f5f5',
        borderColor: '#f5f5f5',
        elevation: 0,
    },
    letterText: {
        fontSize: 22,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    actionLink: {
        padding: 10,
    },
    actionText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    secondaryBtn: {
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    secondaryBtnText: {
        fontWeight: 'bold',
        color: '#666',
    },
    successEmoji: {
        fontSize: 40,
        fontWeight: 'bold',
        color: COLORS.success,
        marginBottom: 10,
    }
});
