export const COLORS = {
    primary: '#102A43', // Dark Slate (Design's primary)
    secondary: '#FFC107', // Amber
    accent: '#4A90E2', // Blue accent
    background: '#FFFFFF', // Main bg is white in design
    backgroundSecondary: '#F7F9FC', // Light gray for sections
    surface: '#FFFFFF',
    cream: '#FFF8E1', // Daily Goal bg
    mint: '#E0F2F1', // Practice bg
    textPrimary: '#102A43',
    textSecondary: '#627D98',
    textLight: '#999999',
    error: '#FF5252',
    success: '#4CAF50',
    white: '#FFFFFF',
    black: '#000000',
    cardYellow: '#FFF8E1',
    cardGray: '#F1F5F9',
    progressBar: '#546E7A',
    border: '#E2E8F0',
    textMain: '#09314C',
    slate: {
        50: '#F8FAFC',
        100: '#F1F5F9',
        200: '#E2E8F0',
        300: '#CBD5E1',
        400: '#94A3B8',
        500: '#64748B',
        600: '#475569',
        700: '#334155',
        800: '#1E293B',
        900: '#0F172A',
    },
    levels: {
        A1: '#8BC34A',
        A2: '#4CAF50',
        B1: '#00BCD4',
        B2: '#2196F3',
        C1: '#9C27B0',
        C2: '#E91E63',
    },
};

// Web & Mobile compatible shadows
// Note: boxShadow is for React Native Web. Elevation is for Android. iOS still needs shadow* props.
// For now, using Platform.select manually or focusing on Web which is user context.
// User is on Web: using boxShadow.
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const SHADOWS = {
    small: isWeb ? {
        boxShadow: '0px 2px 3px rgba(0,0,0,0.1)',
    } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    medium: isWeb ? {
        boxShadow: '0px 4px 6px rgba(0,0,0,0.15)',
    } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },
    large: isWeb ? {
        boxShadow: '0px 6px 10px rgba(0,0,0,0.2)',
    } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
};

export const LAYOUT = {
    padding: 20,
    radius: 12,
    radiusLarge: 20,
};
