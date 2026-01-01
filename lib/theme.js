import { Platform } from 'react-native';

export const COLORS = {
    background: '#F4F6F9',
    surface: '#FFFFFF',

    primary: '#4834D4',       // Deep Blurple
    secondary: '#686DE0',     // Lighter Purple
    accent: '#F9CA24',        // Gold (for stars/streak)

    success: '#6AB04C',       // Pure Apple
    error: '#EB4D4B',         // Carmine Pink
    warning: '#F0932B',       // Orange

    textPrimary: '#130F40',   // Dark Midnight
    textSecondary: '#535C68', // Grey
    textLight: '#95AFC0',     // Light Grey

    border: '#DFF9FB',

    levels: {
        easy: '#6AB04C',
        medium: '#F0932B',
        hard: '#EB4D4B',
    }
};

export const SHADOWS = {
    small: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 2,
    },
    medium: {
        shadowColor: "#4834D4", // Tinted shadow
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 5.46,
        elevation: 5,
    },
    large: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    }
};

export const LAYOUT = {
    radius: 20,
    padding: 20,
};
