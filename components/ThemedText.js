import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS } from '../lib/theme';

export function ThemedText({ style, children, weight = 'regular', ...props }) {
    const getFontFamily = () => {
        switch (weight) {
            case 'bold': return 'Satoshi-Bold';
            case 'medium': return 'Satoshi-Medium';
            case 'black': return 'Satoshi-Black';
            default: return 'Satoshi-Regular';
        }
    };

    return (
        <Text
            style={[
                styles.base,
                { fontFamily: getFontFamily() },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

const styles = StyleSheet.create({
    base: {
        color: COLORS.textPrimary,
        fontSize: 16,
    }
});
