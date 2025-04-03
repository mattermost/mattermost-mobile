// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ReactNativeHapticFeedback, {HapticFeedbackTypes} from 'react-native-haptic-feedback';

import {getIntlShape, emptyFunction, generateId, hapticFeedback, sortByNewest, isBetaApp, type SortByCreatAt} from './';

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
