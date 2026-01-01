import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, SHADOWS, LAYOUT } from '../lib/theme';

export default function AuthScreen() {
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    async function signInWithEmail() {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
        } catch (error) {
            Alert.alert('Sign In Failed', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function signUpWithEmail() {
        if (!username.trim()) {
            Alert.alert('Error', 'Please enter a username');
            return;
        }
        setLoading(true);
        try {
            const { data: { user }, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { username: username }
                }
            });

            if (error) throw error;
            if (user) Alert.alert('Success', 'Check your email for the confirmation link!');
        } catch (error) {
            Alert.alert('Sign Up Failed', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.header}>
                    <Text style={styles.appTitle}>JustABlank</Text>
                    <Text style={styles.appSubtitle}>Master languages, one blank at a time.</Text>
                </View>

                <View style={styles.card}>
                    {/* Toggle Switch */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
                            onPress={() => setIsLogin(true)}
                        >
                            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Sign In</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
                            onPress={() => setIsLogin(false)}
                        >
                            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.formTitle}>
                        {isLogin ? 'Welcome Back!' : 'Create Account'}
                    </Text>

                    {/* Form Fields */}
                    {!isLogin && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Choose a username"
                                placeholderTextColor={COLORS.textLight}
                                autoCapitalize="none"
                                value={username}
                                onChangeText={setUsername}
                            />
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="hello@example.com"
                            placeholderTextColor={COLORS.textLight}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={COLORS.textLight}
                            secureTextEntry={true}
                            autoCapitalize="none"
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={isLogin ? signInWithEmail : signUpWithEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.actionBtnText}>
                                {isLogin ? 'Sign In' : 'Sign Up'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: LAYOUT.padding,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    appTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 5,
        letterSpacing: 1,
    },
    appSubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: LAYOUT.radius,
        padding: 25,
        ...SHADOWS.medium,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 15,
        padding: 5,
        marginBottom: 25,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    toggleBtnActive: {
        backgroundColor: COLORS.surface,
        ...SHADOWS.small,
    },
    toggleText: {
        color: COLORS.textLight,
        fontWeight: '600',
    },
    toggleTextActive: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    formTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.background,
    },
    actionBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 15,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 10,
        ...SHADOWS.medium,
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
