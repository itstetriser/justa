
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated, FlatList, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, LAYOUT, SHADOWS } from '../lib/theme';
import { LinearGradient } from 'expo-linear-gradient'; // Assuming expo is available based on standard RN setups

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
    {
        id: '1',
        type: 'WELCOME',
        title: 'Master Vocabulary\nEffortlessly',
        subtitle: 'Join 2M+ learners building fluency through structured A1-C2 progression and daily micro-habits.',
        image: 'https://img.freepik.com/free-photo/3d-render-books-stack-with-apple-pencil_107791-16347.jpg', // Placeholder for Book
        buttonText: 'Get Started'
    },
    {
        id: '2',
        type: 'RETENTION',
        title: 'Proven Retention Method',
        subtitle: 'Our Spaced Repetition System (SRS) adapts to your memory curve, ensuring you review words at the exact moment before you forget them.',
        image: 'https://img.freepik.com/free-photo/abstract-floral-background-with-blue-leaves_23-2149053916.jpg', // Placeholder for Abstract Flower
        features: [
            { icon: '🎓', label: 'University Verified', text: '' },
            { icon: '🧠', label: 'Memory Boost', text: '' }
        ],
        buttonText: 'Continue'
    },
    {
        id: '3',
        type: 'STREAK',
        title: 'Stay Consistent & Win',
        subtitle: 'Build a learning habit that sticks. Track your daily progress, earn rewards, and watch your vocabulary grow effortlessly.',
        image: null, // Custom UI for Streak
        buttonText: "I'm Ready"
    },
    {
        id: '4',
        type: 'LEVEL',
        title: "What's your current level?",
        subtitle: "We'll tailor your daily words to match your skills.",
        image: null,
        buttonText: null // Selection triggers next
    }
];

export default function OnboardingScreen() {
    const navigation = useNavigation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    // State for Step 4 (Level Selection)
    const [selectedLevel, setSelectedLevel] = useState(null);

    const scrollToNext = () => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            flatListRef.current.scrollToIndex({
                index: currentIndex + 1,
                animated: true
            });
        } else {
            finishOnboarding();
        }
    };

    const finishOnboarding = () => {
        // Navigate to Auth, passing the selected level
        navigation.replace('Auth', { initialLevel: selectedLevel || 'A1' });
    };

    const renderItem = ({ item, index }) => {
        return (
            <View style={{ width: width, flex: 1, alignItems: 'center', padding: 20 }}>
                {/* Progress Bar (Skip for Step 1) */}
                {index > 0 && (
                    <View style={styles.progressBarContainer}>
                        {[...Array(4)].map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.progressSegment,
                                    { backgroundColor: i <= index ? '#4A90E2' : '#E0E0E0' } // Blue or Gray
                                ]}
                            />
                        ))}
                    </View>
                )}

                {/* --- SLIDE 1: WELCOME --- */}
                {item.type === 'WELCOME' && (
                    <View style={styles.slideContent}>
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>✨ Fillt</Text>
                        </View>

                        <Image
                            source={{ uri: item.image }}
                            style={styles.heroImage}
                            resizeMode="contain" // Changed to contain to fit within bounds
                        />

                        <Text style={styles.title}>
                            Master Vocabulary {'\n'}
                            <Text style={{ color: '#4A90E2' }}>Effortlessly</Text>
                        </Text>

                        <Text style={styles.subtitle}>{item.subtitle}</Text>

                        <TouchableOpacity style={styles.primaryBtn} onPress={scrollToNext}>
                            <Text style={styles.primaryBtnText}>{item.buttonText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.navigate('Auth')}>
                            <Text style={{ color: COLORS.textSecondary }}>Already have an account? <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Log in</Text></Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- SLIDE 2: RETENTION --- */}
                {item.type === 'RETENTION' && (
                    <View style={styles.slideContent}>
                        <Image
                            source={{ uri: item.image }}
                            style={[styles.heroImage, { borderRadius: 20 }]}
                            resizeMode="contain"
                        />
                        <View style={styles.verifiedBadge}>
                            <Text style={{ color: '#008000', fontWeight: 'bold' }}>🛡️ Backed by Science</Text>
                        </View>

                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>

                        <View style={styles.featureRow}>
                            {item.features.map((f, i) => (
                                <View key={i} style={styles.featureCard}>
                                    <View style={styles.featureIconBox}>
                                        <Text style={{ fontSize: 24 }}>{f.icon}</Text>
                                    </View>
                                    <Text style={styles.featureLabel}>{f.label}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.darkBtn} onPress={scrollToNext}>
                            <Text style={styles.darkBtnText}>{item.buttonText}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- SLIDE 3: STREAK --- */}
                {item.type === 'STREAK' && (
                    <View style={styles.slideContent}>
                        {/* Custom Streak Visualization Card */}
                        <View style={styles.streakCard}>
                            <View style={styles.streakHeader}>
                                <View>
                                    <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>CURRENT STREAK</Text>
                                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1A1A1A' }}>12 Days</Text>
                                </View>
                                <View style={styles.fireCircle}>
                                    <Text style={{ fontSize: 24 }}>🔥</Text>
                                </View>
                            </View>

                            {/* Goal Reached Floating Badge */}
                            <View style={styles.goalBadge}>
                                <Text style={{ fontWeight: 'bold' }}>🏆 Goal Reached!</Text>
                            </View>

                            {/* Bar Chart Bars */}
                            <View style={styles.chartRow}>
                                {['M', 'T', 'W', 'T'].map((day, i) => (
                                    <View key={i} style={{ alignItems: 'center' }}>
                                        <View style={[styles.bar, {
                                            height: i === 2 ? 60 : 40,
                                            backgroundColor: i === 2 ? '#FF9F43' : '#D1D8E0' // Orange for active, gray others
                                        }]} />
                                        <Text style={{ marginTop: 5, color: '#888', fontSize: 12 }}>{day}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Unlock Toast */}
                            <View style={styles.unlockToast}>
                                <Text>✨ <Text style={{ fontWeight: 'bold' }}>NEW WORD</Text> Unlocked</Text>
                            </View>
                        </View>

                        <Text style={[styles.title, { marginTop: 40 }]}>{item.title}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>

                        <TouchableOpacity style={styles.darkBtn} onPress={scrollToNext}>
                            <Text style={styles.darkBtnText}>{item.buttonText}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- SLIDE 4: LEVEL SELECTION --- */}
                {item.type === 'LEVEL' && (
                    <View style={styles.slideContent}>
                        <View style={{ width: '100%', alignItems: 'flex-start', marginBottom: 20 }}>
                            <TouchableOpacity onPress={() => flatListRef.current.scrollToIndex({ index: index - 1 })} style={{ padding: 10, marginLeft: -10 }}>
                                <Text style={{ fontSize: 24 }}>←</Text>
                            </TouchableOpacity>
                            <Text style={{ alignSelf: 'center', color: '#888', fontWeight: 'bold' }}>Step 4 of 4</Text>
                        </View>

                        <Text style={[styles.title, { textAlign: 'left', alignSelf: 'flex-start' }]}>{item.title}</Text>
                        <Text style={[styles.subtitle, { textAlign: 'left', alignSelf: 'flex-start' }]}>{item.subtitle}</Text>

                        <View style={{ width: '100%', marginTop: 20 }}>
                            {/* Beginner */}
                            <TouchableOpacity
                                style={[styles.levelCard, selectedLevel === 'A1' && styles.levelCardSelected, { borderColor: selectedLevel === 'A1' ? '#4A90E2' : 'transparent' }]}
                                onPress={() => setSelectedLevel('A1')}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                                    <Text style={{ fontSize: 24 }}>🌱</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                        <Text style={styles.levelTitle}>Beginner</Text>
                                        <View style={[styles.tag, { backgroundColor: '#E8F5E9', marginLeft: 10 }]}>
                                            <Text style={{ color: '#2E7D32', fontWeight: 'bold', fontSize: 10 }}>A1 - A2</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.levelDesc}>I know basic greetings and simple phrases.</Text>
                                </View>
                                <View style={[styles.radio, selectedLevel === 'A1' && styles.radioSelected]} />
                            </TouchableOpacity>

                            {/* Intermediate */}
                            <TouchableOpacity
                                style={[styles.levelCard, selectedLevel === 'B1' && styles.levelCardSelected, { borderColor: selectedLevel === 'B1' ? '#4A90E2' : 'transparent' }]}
                                onPress={() => setSelectedLevel('B1')}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                                    <Text style={{ fontSize: 24 }}>🚀</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                        <Text style={styles.levelTitle}>Intermediate</Text>
                                        <View style={[styles.tag, { backgroundColor: '#E3F2FD', marginLeft: 10 }]}>
                                            <Text style={{ color: '#1565C0', fontWeight: 'bold', fontSize: 10 }}>B1 - B2</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.levelDesc}>I can have conversations on familiar topics.</Text>
                                </View>
                                <View style={[styles.radio, selectedLevel === 'B1' && styles.radioSelected]} />
                            </TouchableOpacity>

                            {/* Advanced */}
                            <TouchableOpacity
                                style={[styles.levelCard, selectedLevel === 'C1' && styles.levelCardSelected, { borderColor: selectedLevel === 'C1' ? '#4A90E2' : 'transparent' }]}
                                onPress={() => setSelectedLevel('C1')}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}>
                                    <Text style={{ fontSize: 24 }}>🧠</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                        <Text style={styles.levelTitle}>Advanced</Text>
                                        <View style={[styles.tag, { backgroundColor: '#F3E5F5', marginLeft: 10 }]}>
                                            <Text style={{ color: '#7B1FA2', fontWeight: 'bold', fontSize: 10 }}>C1 - C2</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.levelDesc}>I understand complex texts and nuances.</Text>
                                </View>
                                <View style={[styles.radio, selectedLevel === 'C1' && styles.radioSelected]} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flex: 1 }} />

                        {selectedLevel && (
                            <TouchableOpacity style={styles.darkBtn} onPress={finishOnboarding}>
                                <Text style={styles.darkBtnText}>Continue</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
            <FlatList
                ref={flatListRef}
                data={ONBOARDING_DATA}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false} // Disable manual swipe to enforce flow? Or allow it. Design usually allows swipe. Let's disable to enforce button clicks for logic.
                onMomentumScrollEnd={(ev) => {
                    const index = Math.round(ev.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    slideContent: {
        flex: 1,
        alignItems: 'center',
        width: '100%',
        paddingTop: 20
    },
    progressBarContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 8,
        marginBottom: 30,
        paddingHorizontal: 10
    },
    progressSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    // Screen 1: Welcome
    badgeContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 30,
        ...SHADOWS.small
    },
    badgeText: {
        fontWeight: 'bold',
        color: COLORS.primary
    },
    heroImage: {
        width: 300,
        height: 300,
        borderRadius: 20,
        marginBottom: 40
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1A1A1A',
        marginBottom: 15
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        lineHeight: 24,
        paddingHorizontal: 20,
        marginBottom: 30
    },
    primaryBtn: {
        backgroundColor: '#4A90E2',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        ...SHADOWS.medium
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    // Screen 2
    verifiedBadge: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: -20,
        marginBottom: 30,
        ...SHADOWS.small,
        zIndex: 10
    },
    featureRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 30,
        width: '100%'
    },
    featureCard: {
        flex: 1,
        backgroundColor: '#F0F8FF',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E3F2FD'
    },
    featureIconBox: {
        width: 50, height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    featureLabel: {
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1A1A1A'
    },
    darkBtn: {
        backgroundColor: '#1A2138',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        ...SHADOWS.medium
    },
    darkBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    // Screen 3
    streakCard: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 25,
        padding: 25,
        ...SHADOWS.large,
        marginBottom: 20
    },
    streakHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30
    },
    fireCircle: {
        width: 50, height: 50,
        borderRadius: 25,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center'
    },
    chartRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 100,
        paddingHorizontal: 10
    },
    bar: {
        width: 40,
        borderRadius: 8
    },
    goalBadge: {
        position: 'absolute',
        top: 20, right: -10,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        ...SHADOWS.medium,
        transform: [{ rotate: '5deg' }]
    },
    unlockToast: {
        position: 'absolute',
        bottom: -15, left: -10,
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.medium,
        transform: [{ rotate: '-3deg' }]
    },
    // Screen 4: Level
    levelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    levelCardSelected: {
        backgroundColor: '#F5F9FF'
    },
    iconCircle: {
        width: 50, height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center'
    },
    levelTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#1A1A1A'
    },
    levelDesc: {
        color: '#666',
        fontSize: 13
    },
    tag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5
    },
    radio: {
        width: 24, height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0'
    },
    radioSelected: {
        borderColor: '#4A90E2',
        borderWidth: 6
    }
});
