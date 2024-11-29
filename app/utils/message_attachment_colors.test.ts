// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';

import {getStatusColors} from './message_attachment';

describe('getStatusColors', () => {
    const mockTheme = Preferences.THEMES.denim;

    test('returns correct status colors based on theme', () => {
        const expectedColors: Dictionary<string> = {
            good: '#00c100',
            warning: '#dede01',
            danger: '#d24b4e',
            default: '#3f4350',
            primary: '#1c58d9',
            success: '#3db887',
        };

        const statusColors = getStatusColors(mockTheme);
        expect(statusColors).toEqual(expectedColors);
    });

    test('returns the correct danger color from the theme', () => {
        const statusColors = getStatusColors(mockTheme);
        expect(statusColors.danger).toBe(mockTheme.errorTextColor);
    });

    test('returns the correct default color from the theme', () => {
        const statusColors = getStatusColors(mockTheme);
        expect(statusColors.default).toBe(mockTheme.centerChannelColor);
    });

    test('returns the correct primary color from the theme', () => {
        const statusColors = getStatusColors(mockTheme);
        expect(statusColors.primary).toBe(mockTheme.buttonBg);
    });

    test('returns the correct success color from the theme', () => {
        const statusColors = getStatusColors(mockTheme);
        expect(statusColors.success).toBe(mockTheme.onlineIndicator);
    });
});
