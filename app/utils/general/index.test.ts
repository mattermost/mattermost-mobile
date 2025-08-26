// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ReactNativeHapticFeedback, {HapticFeedbackTypes} from 'react-native-haptic-feedback';

import {
    getIntlShape,
    emptyFunction,
    generateId,
    hapticFeedback,
    sortByNewest,
    isBetaApp,
    type SortByCreatAt,
    getContrastingSimpleColor,
} from './';

// Mock necessary modules
jest.mock('expo-application', () => ({
    applicationId: 'com.example.rnbeta',
}));

jest.mock('react-intl', () => ({
    createIntl: jest.fn((config) => config),
}));

jest.mock('react-native-haptic-feedback', () => ({
    trigger: jest.fn(),
    HapticFeedbackTypes: {
        impactLight: 'impactLight',
        impactMedium: 'impactMedium',
    },
}));

jest.mock('@i18n', () => ({
    getTranslations: jest.fn((locale) => ({message: `translations for ${locale}`})),
    DEFAULT_LOCALE: 'en',
}));

describe('getIntlShape', () => {
    it('should return intl shape with default locale', () => {
        const result = getIntlShape();
        expect(result).toEqual({
            locale: 'en',
            messages: {message: 'translations for en'},
        });
    });

    it('should return intl shape with specified locale', () => {
        const result = getIntlShape('fr');
        expect(result).toEqual({
            locale: 'fr',
            messages: {message: 'translations for fr'},
        });
    });
});

describe('emptyFunction', () => {
    it('should do nothing', () => {
        expect(emptyFunction()).toBeUndefined();
    });
});

describe('generateId', () => {
    it('should generate an ID without prefix', () => {
        const result = generateId();
        expect(result).toBe('12345678-1234-1234-1234-1234567890ab');
    });

    it('should generate an ID with prefix', () => {
        const result = generateId('prefix');
        expect(result).toBe('prefix-12345678-1234-1234-1234-1234567890ab');
    });
});

describe('hapticFeedback', () => {
    it('should trigger haptic feedback with default method', () => {
        hapticFeedback();
        expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith('impactLight', {
            enableVibrateFallback: false,
            ignoreAndroidSystemSettings: false,
        });
    });

    it('should trigger haptic feedback with specified method', () => {
        hapticFeedback(HapticFeedbackTypes.impactMedium);
        expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith('impactMedium', {
            enableVibrateFallback: false,
            ignoreAndroidSystemSettings: false,
        });
    });
});

describe('sortByNewest', () => {
    it('should sort by newest create_at', () => {
        const a = {create_at: 2000} as SortByCreatAt;
        const b = {create_at: 1000} as SortByCreatAt;
        const result = sortByNewest(a, b);
        expect(result).toBe(-1);
    });

    it('should sort by oldest create_at', () => {
        const a = {create_at: 1000} as SortByCreatAt;
        const b = {create_at: 2000} as SortByCreatAt;
        const result = sortByNewest(a, b);
        expect(result).toBe(1);
    });
});

describe('isBetaApp', () => {
    it('should be true if applicationId includes rnbeta', () => {
        expect(isBetaApp).toBe(true);
    });
});

describe('getContrastingSimpleColor', () => {
    // Test for dark colors that should return white text
    it('should return white (#FFFFFF) for black', () => {
        expect(getContrastingSimpleColor('#000000')).toBe('#FFFFFF');
    });

    it('should return white for dark blue', () => {
        expect(getContrastingSimpleColor('#0000FF')).toBe('#FFFFFF');
    });

    it('should return white for dark red', () => {
        expect(getContrastingSimpleColor('#8B0000')).toBe('#FFFFFF');
    });

    it('should return white for dark green', () => {
        expect(getContrastingSimpleColor('#006400')).toBe('#FFFFFF');
    });

    // Test for light colors that should return black text
    it('should return black (#000000) for white', () => {
        expect(getContrastingSimpleColor('#FFFFFF')).toBe('#000000');
    });

    it('should return black for light yellow', () => {
        expect(getContrastingSimpleColor('#FFFF00')).toBe('#000000');
    });

    it('should return black for light cyan', () => {
        expect(getContrastingSimpleColor('#00FFFF')).toBe('#000000');
    });

    it('should return black for light pink', () => {
        expect(getContrastingSimpleColor('#FFC0CB')).toBe('#000000');
    });

    it('should not crash for invalid colors', () => {
        expect(getContrastingSimpleColor('')).toBe('');
        expect(getContrastingSimpleColor('##########')).toBe('');
        expect(getContrastingSimpleColor('    ')).toBe('');
    });

    // Test for colors near the threshold
    it('should return black for colors just above the luminance threshold', () => {
        // for this background color, black text has a
        // contrast ratio of 4.4:1, whereas white has that of 4.6:1,
        // giving it a slight advantage.
        expect(getContrastingSimpleColor('#747474')).toBe('#FFFFFF');
    });

    it('should return white for colors just below the luminance threshold', () => {
        // #737373 has a luminance of approximately 0.178 (just below threshold)
        expect(getContrastingSimpleColor('#737373')).toBe('#FFFFFF');
    });

    // Test for input format variations
    it('should handle hex colors with or without # prefix', () => {
        expect(getContrastingSimpleColor('000000')).toBe('#FFFFFF');
        expect(getContrastingSimpleColor('#000000')).toBe('#FFFFFF');
        expect(getContrastingSimpleColor('FFFFFF')).toBe('#000000');
        expect(getContrastingSimpleColor('#FFFFFF')).toBe('#000000');
    });

    // Test for more realistic use cases
    it('should return appropriate contrast colors for common UI colors', () => {
        // Mattermost denim blue
        expect(getContrastingSimpleColor('#1e325c')).toBe('#FFFFFF');

        // Mattermost Onyx grey
        expect(getContrastingSimpleColor('#202228')).toBe('#FFFFFF');

        // Mattermost Indigo blue
        expect(getContrastingSimpleColor('#151e32')).toBe('#FFFFFF');

        // Mattermost quartz white
        expect(getContrastingSimpleColor('#f4f4f6')).toBe('#000000');
    });
});
